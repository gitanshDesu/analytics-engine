package com.analytics.engine.backend.service;

import com.analytics.engine.backend.dto.responses.*;
import com.analytics.engine.backend.enums.EventType;
import com.analytics.engine.backend.exception.ResourceNotFoundException;
import com.analytics.engine.backend.model.Event;
import com.analytics.engine.backend.model.Session;
import com.analytics.engine.backend.repo.VisitorRepo;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AnalyticDashboardService {

    @Autowired
    @Qualifier("readMongoTemplate")
    private MongoTemplate mongoTemplate;

    @Autowired
    private VisitorRepo visitorRepo;

    private static final int TOP_N = 10;

    public SummaryResponse getSummary(String trackingId, Instant from, Instant to) {
        log.info("getSummary: trackingId={} from={} to={}", trackingId, from, to);
        Criteria baseCriteria = Criteria.where("trackingId").is(trackingId)
                .and("startedAt").gte(from).lte(to);

        // Core session stats
        Aggregation statsAgg = Aggregation.newAggregation(
                Aggregation.match(baseCriteria),
                Aggregation.group()
                        .count().as("totalSessions")
                        .sum("pageViews").as("totalPageViews")
                        .sum(ConditionalOperators.when(Criteria.where("bounced").is(true)).then(1).otherwise(0)).as("bouncedCount")
                        .avg("pageViews").as("avgPagesPerSession")
        );
        Document stats = mongoTemplate.aggregate(statsAgg, "sessions", Document.class).getUniqueMappedResult();

        long totalSessions = stats != null ? ((Number) stats.get("totalSessions")).longValue() : 0L;
        long totalPageViews = stats != null ? ((Number) stats.get("totalPageViews")).longValue() : 0L;
        long bouncedCount = stats != null ? ((Number) stats.get("bouncedCount")).longValue() : 0L;
        double avgPagesPerSession = stats != null ? ((Number) stats.get("avgPagesPerSession")).doubleValue() : 0.0;
        double bounceRate = totalSessions > 0 ? (double) bouncedCount / totalSessions * 100 : 0.0;

        // Avg duration — only ended sessions (durationSeconds > 0)
        Aggregation durationAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("trackingId").is(trackingId)
                        .and("startedAt").gte(from).lte(to)
                        .and("endedAt").ne(null)
                        .and("durationSeconds").gt(0)),
                Aggregation.group().avg("durationSeconds").as("avgDuration")
        );
        Document durationResult = mongoTemplate.aggregate(durationAgg, "sessions", Document.class).getUniqueMappedResult();
        double avgSessionDurationSeconds = durationResult != null ? ((Number) durationResult.get("avgDuration")).doubleValue() : 0.0;

        // Total unique visitors
        Aggregation uniqueVisitorAgg = Aggregation.newAggregation(
                Aggregation.match(baseCriteria),
                Aggregation.group("visitorId"),
                Aggregation.count().as("count")
        );
        Document uvResult = mongoTemplate.aggregate(uniqueVisitorAgg, "sessions", Document.class).getUniqueMappedResult();
        long totalUniqueVisitors = uvResult != null ? ((Number) uvResult.get("count")).longValue() : 0L;

        // New vs returning — get distinct visitorIds, then check firstSeen in range
        Aggregation visitorIdsAgg = Aggregation.newAggregation(
                Aggregation.match(baseCriteria),
                Aggregation.group("visitorId")
        );
        List<String> visitorIds = mongoTemplate.aggregate(visitorIdsAgg, "sessions", Document.class)
                .getMappedResults().stream()
                .map(d -> d.getString("_id"))
                .collect(Collectors.toList());

        long newVisitors = visitorIds.isEmpty() ? 0L
                : visitorRepo.countByVisitorIdInAndFirstSeenBetween(visitorIds, from, to);
        long returningVisitors = totalUniqueVisitors - newVisitors;

        return new SummaryResponse(totalSessions, totalUniqueVisitors, totalPageViews,
                bounceRate, avgSessionDurationSeconds, avgPagesPerSession, newVisitors, returningVisitors);
    }

    public List<TrafficDataPoint> getTrafficOverTime(String trackingId, Instant from, Instant to, String granularity) {
        log.info("getTrafficOverTime: trackingId={} from={} to={} granularity={}", trackingId, from, to, granularity);
        String dateFormat = "weekly".equalsIgnoreCase(granularity) ? "%Y-%U" : "%Y-%m-%d";

        AggregationOperation projectDate = ctx -> new Document("$project",
                new Document("date", new Document("$dateToString",
                        new Document("format", dateFormat).append("date", "$startedAt")))
                        .append("pageViews", 1));

        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("trackingId").is(trackingId)
                        .and("startedAt").gte(from).lte(to)),
                projectDate,
                Aggregation.group("date")
                        .count().as("sessions")
                        .sum("pageViews").as("pageViews"),
                Aggregation.sort(Sort.Direction.ASC, "_id")
        );

        return mongoTemplate.aggregate(agg, "sessions", Document.class)
                .getMappedResults().stream()
                .map(d -> new TrafficDataPoint(
                        d.getString("_id"),
                        ((Number) d.get("sessions")).longValue(),
                        ((Number) d.get("pageViews")).longValue()
                ))
                .collect(Collectors.toList());
    }

    public PagesResponse getPages(String trackingId, Instant from, Instant to) {
        log.info("getPages: trackingId={} from={} to={}", trackingId, from, to);
        // Top pages by PAGE_VIEW events
        Aggregation topPagesAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("trackingId").is(trackingId)
                        .and("eventType").is(EventType.PAGE_VIEW)
                        .and("eventTime").gte(from).lte(to)),
                Aggregation.group("pagePath").count().as("count"),
                Aggregation.sort(Sort.Direction.DESC, "count"),
                Aggregation.limit(TOP_N)
        );
        List<PageStat> topPages = mongoTemplate.aggregate(topPagesAgg, "events", Document.class)
                .getMappedResults().stream()
                .map(d -> new PageStat(d.getString("_id"), ((Number) d.get("count")).longValue()))
                .collect(Collectors.toList());

        // Top landing pages
        Aggregation landingAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("trackingId").is(trackingId)
                        .and("startedAt").gte(from).lte(to)),
                Aggregation.group("landingPage").count().as("count"),
                Aggregation.sort(Sort.Direction.DESC, "count"),
                Aggregation.limit(TOP_N)
        );
        List<PageStat> topLandingPages = mongoTemplate.aggregate(landingAgg, "sessions", Document.class)
                .getMappedResults().stream()
                .map(d -> new PageStat(d.getString("_id"), ((Number) d.get("count")).longValue()))
                .collect(Collectors.toList());

        // Top exit pages
        Aggregation exitAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("trackingId").is(trackingId)
                        .and("startedAt").gte(from).lte(to)
                        .and("exitPage").ne(null)),
                Aggregation.group("exitPage").count().as("count"),
                Aggregation.sort(Sort.Direction.DESC, "count"),
                Aggregation.limit(TOP_N)
        );
        List<PageStat> topExitPages = mongoTemplate.aggregate(exitAgg, "sessions", Document.class)
                .getMappedResults().stream()
                .map(d -> new PageStat(d.getString("_id"), ((Number) d.get("count")).longValue()))
                .collect(Collectors.toList());

        return new PagesResponse(topPages, topLandingPages, topExitPages);
    }

    public EventsResponse getEvents(String trackingId, Instant from, Instant to) {
        log.info("getEvents: trackingId={} from={} to={}", trackingId, from, to);

        Criteria baseCriteria = Criteria.where("trackingId").is(trackingId)
                .and("eventTime").gte(from).lte(to);

        // Breakdown by event type (PAGE_VIEW, BUTTON_CLICK, LINK_CLICK, ELEMENT_CLICK, SCROLL, FORM_SUBMIT)
        List<DeviceBreakdown> eventTypeBreakdown = groupEventsByField(
                "eventType",
                baseCriteria,
                Sort.Direction.DESC,
                TOP_N
        );

        long totalEvents = eventTypeBreakdown.stream()
                .mapToLong(DeviceBreakdown::getCount)
                .sum();

        List<DeviceBreakdown> topLinkClicks = groupEventsByField(
                "payload.href",
                eventCriteria(trackingId, from, to, EventType.LINK_CLICK),
                Sort.Direction.DESC,
                TOP_N
        );

        List<DeviceBreakdown> topButtonClicks = groupEventsByField(
                "payload.text",
                eventCriteria(trackingId, from, to, EventType.BUTTON_CLICK),
                Sort.Direction.DESC,
                TOP_N
        );

        List<DeviceBreakdown> topElementClicks = groupEventsByField(
                "payload.text",
                eventCriteria(trackingId, from, to, EventType.ELEMENT_CLICK),
                Sort.Direction.DESC,
                TOP_N
        );

        List<DeviceBreakdown> topFormSubmits = groupEventsByField(
                "payload.action",
                eventCriteria(trackingId, from, to, EventType.FORM_SUBMIT),
                Sort.Direction.DESC,
                TOP_N
        );

        // Sorted by depth ascending (25/50/75/100), not by count, so it reads as a funnel.
        List<DeviceBreakdown> scrollDepthBreakdown = groupEventsByField(
                "payload.depth",
                eventCriteria(trackingId, from, to, EventType.SCROLL),
                Sort.Direction.ASC,
                Integer.MAX_VALUE
        );

        return new EventsResponse(
                totalEvents,
                eventTypeBreakdown,
                topLinkClicks,
                topButtonClicks,
                topElementClicks,
                topFormSubmits,
                scrollDepthBreakdown
        );
    }

    private Criteria eventCriteria(String trackingId,
                                   Instant from,
                                   Instant to,
                                   EventType eventType) {

        return new Criteria().andOperator(
                Criteria.where("trackingId").is(trackingId),
                Criteria.where("eventTime").gte(from).lte(to),
                Criteria.where("eventType").is(eventType)
        );
    }

    // Sort/limit happen in Java, not the aggregation pipeline, because null and blank-string
    // payload values (e.g. an <input type="submit"> whose label lives in `value`, not
    // textContent — see sdk/index.js#getElementLabel) both need to collapse into one
    // "(unknown)" bucket. Grouping them in Mongo first would keep them as separate _id groups,
    // so a DB-side sort+limit could rank and return duplicate "(unknown)" rows instead of one
    // merged one.
    private List<DeviceBreakdown> groupEventsByField(String field, Criteria match, Sort.Direction sortDirection, int limit) {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(match),
                Aggregation.group(field).count().as("count")
        );

        Map<String, Long> counts = new LinkedHashMap<>();
        for (Document d : mongoTemplate.aggregate(agg, "events", Document.class).getMappedResults()) {
            Object rawLabel = d.get("_id");
            String label = rawLabel == null || String.valueOf(rawLabel).isBlank()
                    ? "(unknown)" : String.valueOf(rawLabel);
            counts.merge(label, ((Number) d.get("count")).longValue(), Long::sum);
        }

        Comparator<Map.Entry<String, Long>> comparator = sortDirection == Sort.Direction.ASC
                ? Map.Entry.comparingByKey()
                : Map.Entry.<String, Long>comparingByValue().reversed();

        return counts.entrySet().stream()
                .sorted(comparator)
                .limit(limit)
                .map(e -> new DeviceBreakdown(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    // Each entry in `stepDefinitions` is "EVENT_TYPE" or "EVENT_TYPE:text", e.g.
    // "BUTTON_CLICK:View Prices" — text (if present) is matched case-insensitively against
    // either payload.text or payload.href, since the frontend doesn't know ahead of time
    // which field a given event type populates. A step's count is the number of *distinct
    // sessions* with at least one matching event — presence-based, not strict event-order —
    // which is the simplest funnel definition and enough for "did this session do X".
    public FunnelResponse getFunnel(String trackingId, Instant from, Instant to, List<String> stepDefinitions) {
        log.info("getFunnel: trackingId={} from={} to={} steps={}", trackingId, from, to, stepDefinitions);

        List<FunnelStep> result = new ArrayList<>();
        Long firstStepCount = null;
        Long previousStepCount = null;

        for (String stepDefinition : stepDefinitions) {
            String[] parts = stepDefinition.split(":", 2);
            EventType eventType = EventType.valueOf(parts[0].trim().toUpperCase());
            String textFilter = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : null;

            Criteria criteria = funnelStepCriteria(trackingId, from, to, eventType, textFilter);
            Aggregation agg = Aggregation.newAggregation(
                    Aggregation.match(criteria),
                    Aggregation.group("sessionId"),
                    Aggregation.count().as("count")
            );
            Document doc = mongoTemplate.aggregate(agg, "events", Document.class).getUniqueMappedResult();
            long sessionCount = doc != null ? ((Number) doc.get("count")).longValue() : 0L;

            if (firstStepCount == null) firstStepCount = sessionCount;
            double percentOfFirstStep = firstStepCount > 0 ? (double) sessionCount / firstStepCount * 100 : 0.0;
            double percentOfPreviousStep = previousStepCount == null ? 100.0
                    : previousStepCount > 0 ? (double) sessionCount / previousStepCount * 100 : 0.0;

            String label = textFilter != null ? textFilter : humanizeEventType(eventType);
            result.add(new FunnelStep(label, eventType.name(), textFilter, sessionCount,
                    percentOfFirstStep, percentOfPreviousStep));
            previousStepCount = sessionCount;
        }

        return new FunnelResponse(result);
    }

    private Criteria funnelStepCriteria(String trackingId, Instant from, Instant to,
                                         EventType eventType, String textFilter) {
        List<Criteria> ands = new ArrayList<>();
        ands.add(Criteria.where("trackingId").is(trackingId));
        ands.add(Criteria.where("eventType").is(eventType));
        ands.add(Criteria.where("eventTime").gte(from).lte(to));
        if (textFilter != null) {
            String quoted = Pattern.quote(textFilter);
            ands.add(new Criteria().orOperator(
                    Criteria.where("payload.text").regex(quoted, "i"),
                    Criteria.where("payload.href").regex(quoted, "i")
            ));
        }
        return new Criteria().andOperator(ands.toArray(new Criteria[0]));
    }

    private String humanizeEventType(EventType eventType) {
        return switch (eventType) {
            case PAGE_VIEW -> "Page view";
            case BUTTON_CLICK -> "Button click";
            case LINK_CLICK -> "Link click";
            case ELEMENT_CLICK -> "Element click";
            case FORM_SUBMIT -> "Form submit";
            case SCROLL -> "Scroll";
        };
    }

    public List<SourceStat> getSources(String trackingId, Instant from, Instant to) {
        log.info("getSources: trackingId={} from={} to={}", trackingId, from, to);
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("trackingId").is(trackingId)
                        .and("startedAt").gte(from).lte(to)),
                Aggregation.group("referer").count().as("sessions"),
                Aggregation.sort(Sort.Direction.DESC, "sessions"),
                Aggregation.limit(TOP_N)
        );
        return mongoTemplate.aggregate(agg, "sessions", Document.class)
                .getMappedResults().stream()
                .map(d -> {
                    String source = d.getString("_id");
                    return new SourceStat(source != null ? source : "Direct", ((Number) d.get("sessions")).longValue());
                })
                .collect(Collectors.toList());
    }

    public DevicesResponse getDevices(String trackingId, Instant from, Instant to) {
        log.info("getDevices: trackingId={} from={} to={}", trackingId, from, to);
        Criteria match = Criteria.where("trackingId").is(trackingId)
                .and("startedAt").gte(from).lte(to);

        return new DevicesResponse(
                groupSessionsByField("browser", match),
                groupSessionsByField("os", match),
                groupSessionsByField("deviceType", match)
        );
    }

    private List<DeviceBreakdown> groupSessionsByField(String field, Criteria match) {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(match),
                Aggregation.group(field).count().as("count"),
                Aggregation.sort(Sort.Direction.DESC, "count")
        );
        return mongoTemplate.aggregate(agg, "sessions", Document.class)
                .getMappedResults().stream()
                .map(d -> new DeviceBreakdown(d.getString("_id"), ((Number) d.get("count")).longValue()))
                .collect(Collectors.toList());
    }

    public SessionListResponse getSessions(String trackingId, Instant from, Instant to, int limit) {
        log.info("getSessions: trackingId={} from={} to={} limit={}", trackingId, from, to, limit);
        Query query = Query.query(Criteria.where("trackingId").is(trackingId)
                        .and("startedAt").gte(from).lte(to))
                .with(Sort.by(Sort.Direction.DESC, "startedAt"))
                .limit(limit);

        List<SessionSummary> summaries = mongoTemplate.find(query, Session.class).stream()
                .map(this::toSessionSummary)
                .collect(Collectors.toList());

        return new SessionListResponse(summaries);
    }

    public SessionDetailResponse getSessionDetail(String trackingId, String sessionId) {
        log.info("getSessionDetail: trackingId={} sessionId={}", trackingId, sessionId);
        Session session = mongoTemplate.findOne(
                Query.query(Criteria.where("trackingId").is(trackingId).and("sessionId").is(sessionId)),
                Session.class);
        if (session == null) {
            throw new ResourceNotFoundException("Session not found");
        }

        Query eventsQuery = Query.query(Criteria.where("trackingId").is(trackingId).and("sessionId").is(sessionId))
                .with(Sort.by(Sort.Direction.ASC, "eventTime"));
        List<SessionTimelineEvent> timeline = mongoTemplate.find(eventsQuery, Event.class).stream()
                .map(e -> new SessionTimelineEvent(
                        e.getEventType().name(), e.getPagePath(), e.getPageTitle(), e.getEventTime(), e.getPayload()))
                .collect(Collectors.toList());

        return new SessionDetailResponse(toSessionSummary(session), timeline);
    }

    private SessionSummary toSessionSummary(Session s) {
        return new SessionSummary(
                s.getSessionId(), s.getVisitorId(), s.getStartedAt(), s.getEndedAt(),
                s.getLandingPage(), s.getExitPage(), s.getPageViews(), s.getEventCount(),
                s.getDurationSeconds(), s.getBounced(), s.getBrowser(), s.getOs(), s.getDeviceType()
        );
    }
}
