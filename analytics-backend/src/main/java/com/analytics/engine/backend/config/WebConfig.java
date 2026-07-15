package com.analytics.engine.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * The SDK's `/session/end` and `/event/register` beacons (sent via `navigator.sendBeacon`
     * during page unload/tab-hide) use a `text/plain` Content-Type on purpose — it's the only
     * way to keep those cross-origin requests CORS-preflight-free so they reliably survive page
     * teardown (see sdk/index.js#postJsonBeacon). The body itself is still JSON, so the Jackson
     * converter needs to be told it can read `text/plain` too, or @RequestBody deserialization
     * on those endpoints would 415 for every beacon-delivered call.
     */
    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        for (HttpMessageConverter<?> converter : converters) {
            if (converter instanceof MappingJackson2HttpMessageConverter jacksonConverter) {
                List<MediaType> supportedMediaTypes = new ArrayList<>(jacksonConverter.getSupportedMediaTypes());
                supportedMediaTypes.add(MediaType.TEXT_PLAIN);
                jacksonConverter.setSupportedMediaTypes(supportedMediaTypes);
            }
        }
    }
}
