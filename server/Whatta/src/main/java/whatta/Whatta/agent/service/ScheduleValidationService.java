package whatta.Whatta.agent.service;

import org.springframework.stereotype.Component;
import whatta.Whatta.agent.payload.dto.NormalizedSchedule;
import whatta.Whatta.agent.payload.dto.ScheduleCandidate;

import java.util.List;

@Component
public class ScheduleValidationService {

    public boolean isValidRuleBasedCandidate(ScheduleCandidate candidate) {
        if (candidate == null || candidate.title() == null || candidate.title().isBlank()) {
            return false;
        }

        if (candidate.type() == ScheduleCandidate.CandidateType.EVENT) {
            return candidate.startDate() != null;
        }

        return candidate.dueDateTime() != null || candidate.startDate() != null;
    }

    public boolean isValidNormalizedSchedule(NormalizedSchedule schedule) {
        if (schedule == null || schedule.title() == null || schedule.title().isBlank()) {
            return false;
        }
        if (!schedule.isScheduled()) {
            return false;
        }
        if (schedule.isEvent() && schedule.startDate() == null) {
            return false;
        }
        if (!schedule.isEvent() && schedule.dueDateTime() == null && schedule.startDate() == null) {
            return false;
        }
        if (schedule.startTime() != null && schedule.endTime() != null && !schedule.endTime().isAfter(schedule.startTime())) {
            return false;
        }
        return true;
    }

    public List<NormalizedSchedule> filterValidNormalizedSchedules(List<NormalizedSchedule> schedules) {
        if (schedules == null) {
            return List.of();
        }

        return schedules.stream()
                .filter(this::isValidNormalizedSchedule)
                .toList();
    }
}
