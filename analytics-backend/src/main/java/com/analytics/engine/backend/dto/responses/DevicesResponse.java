package com.analytics.engine.backend.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DevicesResponse {
    private List<DeviceBreakdown> browsers;
    private List<DeviceBreakdown> operatingSystems;
    private List<DeviceBreakdown> deviceTypes;
}
