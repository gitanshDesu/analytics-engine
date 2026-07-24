const EVENT_TYPE_LABELS = {
  PAGE_VIEW: "Page view",
  BUTTON_CLICK: "Button click",
  LINK_CLICK: "Link click",
  ELEMENT_CLICK: "Element click",
  SCROLL: "Scroll",
  FORM_SUBMIT: "Form submit",
};

export function eventTypeLabel(eventType) {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

/** One-line human description of a SessionTimelineEvent, derived from its payload shape. */
export function describeEvent(event) {
  const payload = event.payload ?? {};
  switch (event.eventType) {
    case "BUTTON_CLICK":
      return payload.text || "(unlabeled button)";
    case "LINK_CLICK":
      return payload.text || payload.href || "(unlabeled link)";
    case "ELEMENT_CLICK":
      return payload.text || "(unlabeled element)";
    case "FORM_SUBMIT":
      return payload.formName || payload.action || "(unlabeled form)";
    case "SCROLL":
      return `Scrolled to ${payload.depth}%`;
    case "PAGE_VIEW":
    default:
      return event.pagePath;
  }
}
