"""Domain-specific metric groupings for combine data visualizations.

This module centralises how the 84 recorded tests are mapped into
actionable dashboard metrics.  Each metric describes the source tests,
the intent of the aggregation, and how to interpret the value.  The
goal is to provide a single source of truth for front-end charting and
future analytics jobs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class MetricDefinition:
    """Descriptor for a derived combine metric."""

    id: str
    name: str
    category: str
    description: str
    primary_tests: Sequence[str]
    calculation: str
    direction: str
    supporting_tests: Sequence[str] | None = None
    tags: Sequence[str] | None = None


# NOTE: All test names match the canonical entries from
# `source/testing_sheet_u19.json` to keep lookups trivial.
METRIC_DEFINITIONS: tuple[MetricDefinition, ...] = (
    MetricDefinition(
        id="anthropometrics_profile",
        name="Anthropometric Profile",
        category="General Info",
        description=(
            "Standardized summary of the athlete's basic measurements to allow "
            "quick comparisons with position or age group references."
        ),
        primary_tests=(
            "Height",
            "Sitting Height",
            "Body Weight",
            "Body Mass Index (BMI)",
        ),
        calculation=(
            "Display raw values and derive percentiles/z-scores from "
            "external reference tables."
        ),
        direction="mixed",
        tags=("size", "monitoring"),
    ),
    MetricDefinition(
        id="resting_readiness",
        name="Cardiorespiratory Readiness",
        category="General Info",
        description=(
            "Physiological state at rest and initial recovery capacity."
        ),
        primary_tests=(
            "Resting Heart Rate (Seated)",
            "Recovery Time (60 s)",
            "Maximum Heart Rate",
        ),
        calculation=(
            "Normalize resting heart rate and recovery time, calculate "
            "a weighted average (inverse rest HR + inverse recovery) "
            "and contextualize with the theoretical maximum (220 - age)."
        ),
        direction="higher_is_better",
        tags=("physiology", "monitoring"),
    ),
    MetricDefinition(
        id="mobility_balance",
        name="Mobility and Balance",
        category="Physical",
        description=(
            "Joint mobility and multiplanar balance control ability."
        ),
        primary_tests=(
            "Knee to Wall",
            "Sit-and-Reach Flexibility",
            "Y Balance Test – Right Anterior",
            "Y Balance Test – Right Posteromedial",
            "Y Balance Test – Right Posterolateral",
            "Y Balance Test – Left Anterior",
            "Y Balance Test – Left Posteromedial",
            "Y Balance Test – Left Posterolateral",
        ),
        supporting_tests=(
            "Hamstring Pull (Right)",
            "Hamstring Pull (Left)",
            "Quad Pull (Right)",
            "Quad Pull (Left)",
            "Hip External Rotation Pull (Right)",
            "Hip External Rotation Pull (Left)",
            "Hip Internal Rotation Pull (Right)",
            "Hip Internal Rotation Pull (Left)",
            "Calf Pull (Right)",
            "Calf Pull (Left)",
        ),
        calculation=(
            "Convert each test into a percentage score (current result / "
            "reference) and generate a general average with highlights per side to "
            "detect asymmetries."
        ),
        direction="higher_is_better",
        tags=("mobility", "prevention"),
    ),
    MetricDefinition(
        id="reactive_quickness",
        name="Reaction Time and Coordination",
        category="Physical",
        description=(
            "Neuromuscular response to visual stimuli and fine coordination."
        ),
        primary_tests=(
            "Reaction Time: Ruler Drop (Right Hand)",
            "Reaction Time: Ruler Drop (Left Hand)",
            "Eye-Hand Coordination (FitLight)",
            "Eye-Foot Coordination (FitLight)",
        ),
        calculation=(
            "Calculate the average of hands/feet, convert to milliseconds "
            "when necessary and create an inverse index (lower time = better)."
        ),
        direction="higher_is_better",
        tags=("coordination", "neuromuscular"),
    ),
    MetricDefinition(
        id="upper_body_endurance",
        name="Upper Body Strength",
        category="Physical",
        description="Pushing/pulling strength and endurance of the trunk and arms.",
        primary_tests=(
            "Push-Ups (1 min)",
            "Dead Hang",
            "Pull-Down Power",
            "Lift-Up Power",
        ),
        calculation=(
            "Standardize repetitions per minute and power readings to "
            "w/kg (use body mass from anthropometric profile) and generate average."
        ),
        direction="higher_is_better",
        tags=("strength", "upper"),
    ),
    MetricDefinition(
        id="core_stability",
        name="Core Strength",
        category="Physical",
        description="Trunk stabilization capacity in isometry and repetition.",
        primary_tests=(
            "Plank (Max Time)",
            "Sit-Ups (1 min)",
        ),
        calculation=(
            "Convert results to z-scores by age group and generate "
            "a simple average, highlighting isometric time vs repetitions."
        ),
        direction="higher_is_better",
        tags=("core", "stability"),
    ),
    MetricDefinition(
        id="lower_body_power",
        name="Lower Body Power",
        category="Physical",
        description="Vertical and horizontal explosion for jumps and starts.",
        primary_tests=(
            "Vertical Jump (No Run-Up)",
            "Vertical Jump (Run-Up)",
            "Standing Long Jump (inches)",
        ),
        calculation=(
            "Convert jumps into estimated power (Sayers or "
            "Lewis formula) and generate a weighted average to highlight gain with running."
        ),
        direction="higher_is_better",
        tags=("power", "lower"),
    ),
    MetricDefinition(
        id="short_acceleration",
        name="0-15m Acceleration",
        category="Physical",
        description="Initial burst over short distances (0-15 meters).",
        primary_tests=(
            "5 m Sprint",
            "10 m Sprint",
            "15 m Sprint",
        ),
        calculation=(
            "Calculate average speeds per split (distance/time), "
            "obtain a composite index = average ((v5 + v10 + v15) / 3)."
        ),
        direction="higher_is_better",
        tags=("speed", "acceleration"),
    ),
    MetricDefinition(
        id="top_end_speed",
        name="Maximum Speed",
        category="Physical",
        description="Top speed sustained in longer sprints.",
        primary_tests=(
            "30 m Sprint",
            "35 m Sprint",
            "40 m Sprint",
        ),
        supporting_tests=(
            "20 m Sprint",
            "25 m Sprint",
        ),
        calculation=(
            "Select the shortest available time at the longest distance, "
            "convert to m/s and compare with benchmarks by position."
        ),
        direction="higher_is_better",
        tags=("speed", "top_speed"),
    ),
    MetricDefinition(
        id="change_of_direction",
        name="Agility / Change of Direction",
        category="Physical",
        description="Efficiency in quick transitions without the ball.",
        primary_tests=(
            "20 m Slalom (No Ball)",
            "T-Drill",
            "T-Pro Drill",
            "Illinois Test (No Ball)",
        ),
        calculation=(
            "Normalize times per test, invert the scale (lower = better) "
            "and calculate average. Also record delta between linear vs "
            "multi-cut tests."
        ),
        direction="higher_is_better",
        tags=("agility", "change_of_direction"),
    ),
    MetricDefinition(
        id="dribbling_agility",
        name="Agility with Ball",
        category="Technical",
        description="Maintaining agility when the ball is under control.",
        primary_tests=(
            "20 m Slalom with Ball",
            "T-Pro Drill with Ball",
            "Illinois Test with Ball",
        ),
        calculation=(
            "Compare times with the no-ball equivalents to generate a "
            "penalty index (% speed loss)."
        ),
        direction="higher_is_better",
        tags=("agility", "ball_control"),
    ),
    MetricDefinition(
        id="aerobic_capacity",
        name="Aerobic Capacity",
        category="Physical",
        description="Cardiorespiratory fitness for prolonged efforts.",
        primary_tests=(
            "Beep Test",
        ),
        supporting_tests=(
            "Recovery Time (60 s)",
            "Maximum Heart Rate",
        ),
        calculation=(
            "Convert Beep Test level/shuttles to estimated VO₂max and "
            "adjust according to post-test recovery (shorter time = better)."
        ),
        direction="higher_is_better",
        tags=("endurance", "cardio"),
    ),
    MetricDefinition(
        id="ball_mastery",
        name="Ball Mastery",
        category="Technical",
        description="Close control and individual handling ability.",
        primary_tests=(
            "Keep-Ups: Pick Up Three Objects",
            "Super 4",
            "Super 7",
            "Super 14",
            "Maradona",
            "Rainbow",
            "Keep-Ups: Distance and Time",
        ),
        calculation=(
            "Sum challenge scores and normalize by time/distance "
            "where applicable, producing a single score (0-100)."
        ),
        direction="higher_is_better",
        tags=("skill", "ball_control"),
    ),
    MetricDefinition(
        id="shoot_power_right",
        name="Shooting Power (Right)",
        category="Technical",
        description="Average shooting power of the right leg.",
        primary_tests=(
            "Shot Power (No Run-Up, Right Foot)",
            "Shot Power (Run-Up, Right Foot)",
        ),
        calculation=(
            "Calculate average and peak (km/h) between attempts with and without a run-up."
        ),
        direction="higher_is_better",
        tags=("shooting", "right_foot"),
    ),
    MetricDefinition(
        id="shoot_power_left",
        name="Shooting Power (Left)",
        category="Technical",
        description="Average shooting power of the left leg.",
        primary_tests=(
            "Shot Power (No Run-Up, Left Foot)",
            "Shot Power (Run-Up, Left Foot)",
        ),
        calculation=(
            "Same approach as the right; provides a basis for analyzing symmetry."
        ),
        direction="higher_is_better",
        tags=("shooting", "left_foot"),
    ),
    MetricDefinition(
        id="shoot_accuracy_right",
        name="Shooting Accuracy (Right)",
        category="Technical",
        description="Shooting consistency with the dominant (right) leg.",
        primary_tests=(
            "10 m Accuracy Kick (Right Foot, 5 attempts)",
            "15 m Driven Shot (Right Foot, 5 attempts)",
            "25 m Driven Shot (Right Foot, 5 attempts)",
            "35 m Driven Shot (Right Foot, 5 attempts)",
        ),
        calculation=(
            "Transform hits into % per distance and calculate a weighted average "
            "with greater weight for long distances."
        ),
        direction="higher_is_better",
        tags=("shooting", "accuracy"),
    ),
    MetricDefinition(
        id="shoot_accuracy_left",
        name="Shooting Accuracy (Left)",
        category="Technical",
        description="Shooting consistency with the non-dominant (left) leg.",
        primary_tests=(
            "10 m Accuracy Kick (Left Foot, 5 attempts)",
            "15 m Driven Shot (Left Foot, 5 attempts)",
            "25 m Driven Shot (Left Foot, 5 attempts)",
            "35 m Driven Shot (Left Foot, 5 attempts)",
        ),
        calculation=(
            "Same weighting used for the right leg to facilitate "
            "comparisons."
        ),
        direction="higher_is_better",
        tags=("shooting", "accuracy"),
    ),
    MetricDefinition(
        id="cross_accuracy_right",
        name="Crossing Accuracy (Right)",
        category="Technical",
        description="Quality of lateral service with the right leg.",
        primary_tests=(
            "25 m Wing Delivery to Runner (Low, Right Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (Mid, Right Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (High, Right Foot, 5 attempts)",
        ),
        calculation=(
            "Calculate hit % by height and generate average; report variation "
            "to identify the best crossing range."
        ),
        direction="higher_is_better",
        tags=("crossing", "right_foot"),
    ),
    MetricDefinition(
        id="cross_accuracy_left",
        name="Crossing Accuracy (Left)",
        category="Technical",
        description="Quality of lateral service with the left leg.",
        primary_tests=(
            "25 m Wing Delivery to Runner (Low, Left Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (Mid, Left Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (High, Left Foot, 5 attempts)",
        ),
        calculation=(
            "Same structure as the right leg; facilitates laterality analysis."
        ),
        direction="higher_is_better",
        tags=("crossing", "left_foot"),
    ),
    MetricDefinition(
        id="two_footedness_index",
        name="Two-Footedness Index",
        category="Technical",
        description="Balance between feet in offensive power and accuracy.",
        primary_tests=(
            "Shot Power (Run-Up, Right Foot)",
            "Shot Power (Run-Up, Left Foot)",
            "35 m Driven Shot (Right Foot, 5 attempts)",
            "35 m Driven Shot (Left Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (High, Right Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (High, Left Foot, 5 attempts)",
        ),
        calculation=(
            "Calculate the relative difference between feet (% average difference) and "
            "subtract from 100 to get an index (0 = completely one-sided, "
            "100 = perfect balance)."
        ),
        direction="higher_is_better",
        tags=("laterality", "symmetry"),
    ),
)


def get_metric_by_id(metric_id: str) -> MetricDefinition:
    """Return a metric definition by identifier."""

    for metric in METRIC_DEFINITIONS:
        if metric.id == metric_id:
            return metric
    raise KeyError(f"Unknown metric id: {metric_id}")


def list_metrics(category: str | None = None) -> tuple[MetricDefinition, ...]:
    """List metrics, optionally filtered by category."""

    if category is None:
        return METRIC_DEFINITIONS
    return tuple(metric for metric in METRIC_DEFINITIONS if metric.category == category)

