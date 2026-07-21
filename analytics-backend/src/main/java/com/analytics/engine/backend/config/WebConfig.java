package com.analytics.engine.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * The SDK's `/session/end` and `/event/register` beacons (sent via `navigator.sendBeacon`
     * during page unload/tab-hide) use a `text/plain` Content-Type on purpose — it's the only
     * way to keep those cross-origin requests CORS-preflight-free so they reliably survive page
     * teardown (see sdk/index.js#postJsonBeacon). The body itself is still JSON, so the JSON
     * converter needs to be told it can read `text/plain` too, or @RequestBody deserialization
     * on those endpoints would 415 for every beacon-delivered call.
     *
     * Matched by capability (already supports application/json) rather than a specific class —
     * Spring Boot 4 registers JacksonJsonHttpMessageConverter (Jackson 3) here, not the legacy
     * MappingJackson2HttpMessageConverter, so hardcoding the old class silently no-ops this fix.
     */
    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        for (HttpMessageConverter<?> converter : converters) {
            if (converter instanceof AbstractHttpMessageConverter<?> jsonConverter
                    && jsonConverter.getSupportedMediaTypes().contains(MediaType.APPLICATION_JSON)) {
                List<MediaType> supportedMediaTypes = new ArrayList<>(jsonConverter.getSupportedMediaTypes());
                supportedMediaTypes.add(MediaType.TEXT_PLAIN);
                jsonConverter.setSupportedMediaTypes(supportedMediaTypes);
            }
        }
    }
}
