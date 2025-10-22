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
        name="Perfil Antropométrico",
        category="General Info",
        description=(
            "Resumo padronizado das medidas básicas do atleta para permitir "
            "comparações rápidas com referências de posição ou faixa etária."
        ),
        primary_tests=(
            "Height",
            "Sitting Height",
            "Body Weight",
            "Body Mass Index (BMI)",
        ),
        calculation=(
            "Exibir os valores brutos e derivar percentis/z-scores a partir "
            "de tabelas de referência externas."
        ),
        direction="mixed",
        tags=("size", "monitoramento"),
    ),
    MetricDefinition(
        id="resting_readiness",
        name="Prontidão Cardiorrespiratória",
        category="General Info",
        description=(
            "Estado fisiológico em repouso e capacidade inicial de recuperação."
        ),
        primary_tests=(
            "Resting Heart Rate (Seated)",
            "Recovery Time (60 s)",
            "Maximum Heart Rate",
        ),
        calculation=(
            "Normalizar batimento em repouso e tempo de recuperação, calcular "
            "uma média ponderada (rest HR inverso + recuperação inversa) "
            "e contextualizar com o máximo teórico (220 - idade)."
        ),
        direction="higher_is_better",
        tags=("fisiologia", "monitoramento"),
    ),
    MetricDefinition(
        id="mobility_balance",
        name="Mobilidade e Equilíbrio",
        category="Physical",
        description=(
            "Capacidade de mobilidade articular e controle de equilíbrio "
            "multiplanar."
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
            "Converter cada teste em score porcentual (resultado atual / "
            "referência) e gerar média geral com destaques por lado para "
            "detectar assimetrias."
        ),
        direction="higher_is_better",
        tags=("mobilidade", "prevenção"),
    ),
    MetricDefinition(
        id="reactive_quickness",
        name="Tempo de Reação e Coordenação",
        category="Physical",
        description=(
            "Resposta neuromuscular em estímulos visuais e coordenação fina."
        ),
        primary_tests=(
            "Reaction Time: Ruler Drop (Right Hand)",
            "Reaction Time: Ruler Drop (Left Hand)",
            "Eye-Hand Coordination (FitLight)",
            "Eye-Foot Coordination (FitLight)",
        ),
        calculation=(
            "Calcular média das mãos/pés, converter para milissegundos "
            "quando necessário e criar índice inverso (menor tempo = melhor)."
        ),
        direction="higher_is_better",
        tags=("coordenação", "neuromuscular"),
    ),
    MetricDefinition(
        id="upper_body_endurance",
        name="Força de Membros Superiores",
        category="Physical",
        description="Resistência e potência de empurrar/puxar do tronco e braços.",
        primary_tests=(
            "Push-Ups (1 min)",
            "Dead Hang",
            "Pull-Down Power",
            "Lift-Up Power",
        ),
        calculation=(
            "Padronizar repetições por minuto e leituras de potência para "
            "w/kg (usar massa corporal do perfil antropométrico) e gerar média."
        ),
        direction="higher_is_better",
        tags=("força", "superior"),
    ),
    MetricDefinition(
        id="core_stability",
        name="Resistência do Core",
        category="Physical",
        description="Capacidade de estabilização do tronco em isometria e repetição.",
        primary_tests=(
            "Plank (Max Time)",
            "Sit-Ups (1 min)",
        ),
        calculation=(
            "Converter os resultados para z-scores por faixa etária e gerar "
            "média simples, destacando tempo isométrico vs repetições."
        ),
        direction="higher_is_better",
        tags=("core", "estabilidade"),
    ),
    MetricDefinition(
        id="lower_body_power",
        name="Potência de Membros Inferiores",
        category="Physical",
        description="Explosão vertical e horizontal para saltos e arranques.",
        primary_tests=(
            "Vertical Jump (No Run-Up)",
            "Vertical Jump (Run-Up)",
            "Standing Long Jump (inches)",
        ),
        calculation=(
            "Converter saltos em potência estimada (Fórmula de Sayers ou "
            "Lewis) e gerar média ponderada para destacar ganho com corrida."
        ),
        direction="higher_is_better",
        tags=("potência", "inferior"),
    ),
    MetricDefinition(
        id="short_acceleration",
        name="Aceleração 0-15 m",
        category="Physical",
        description="Explosão inicial em distâncias curtas (0-15 metros).",
        primary_tests=(
            "5 m Sprint",
            "10 m Sprint",
            "15 m Sprint",
        ),
        calculation=(
            "Calcular velocidades médias por parcial (distância/tempo), "
            "obter índice composto = média ((v5 + v10 + v15) / 3)."
        ),
        direction="higher_is_better",
        tags=("velocidade", "aceleração"),
    ),
    MetricDefinition(
        id="top_end_speed",
        name="Velocidade Máxima",
        category="Physical",
        description="Top speed sustentada em sprints mais longos.",
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
            "Selecionar o menor tempo disponível na maior distância, "
            "converter para m/s e comparar com benchmarks por posição."
        ),
        direction="higher_is_better",
        tags=("velocidade", "top_speed"),
    ),
    MetricDefinition(
        id="change_of_direction",
        name="Agilidade / Mudança de Direção",
        category="Physical",
        description="Eficiência em transições rápidas sem bola.",
        primary_tests=(
            "20 m Slalom (No Ball)",
            "T-Drill",
            "T-Pro Drill",
            "Illinois Test (No Ball)",
        ),
        calculation=(
            "Normalizar tempos por teste, inverter a escala (menor = melhor) "
            "e calcular média. Também registrar delta entre testes lineares vs "
            "multi-cortes."
        ),
        direction="higher_is_better",
        tags=("agilidade", "mudanca_direcao"),
    ),
    MetricDefinition(
        id="dribbling_agility",
        name="Agilidade com Bola",
        category="Technical",
        description="Manutenção de agilidade quando a bola está sob controle.",
        primary_tests=(
            "20 m Slalom with Ball",
            "T-Pro Drill with Ball",
            "Illinois Test with Ball",
        ),
        calculation=(
            "Comparar tempos com os equivalentes sem bola para gerar índice "
            "de penalidade (% perda de velocidade)."
        ),
        direction="higher_is_better",
        tags=("agilidade", "controle_bola"),
    ),
    MetricDefinition(
        id="aerobic_capacity",
        name="Capacidade Aeróbia",
        category="Physical",
        description="Aptidão cardiorrespiratória para esforços prolongados.",
        primary_tests=(
            "Beep Test",
        ),
        supporting_tests=(
            "Recovery Time (60 s)",
            "Maximum Heart Rate",
        ),
        calculation=(
            "Converter nível/palmas do Beep Test para VO₂max estimado e "
            "ajustar conforme recuperação pós-teste (tempo menor = melhor)."
        ),
        direction="higher_is_better",
        tags=("endurance", "cardio"),
    ),
    MetricDefinition(
        id="ball_mastery",
        name="Domínio de Bola",
        category="Technical",
        description="Controle próximo e habilidade de manipulação individual.",
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
            "Somar pontuações dos desafios e normalizar pelo tempo/distância "
            "quando aplicável, produzindo score único (0-100)."
        ),
        direction="higher_is_better",
        tags=("habilidade", "controle_bola"),
    ),
    MetricDefinition(
        id="shoot_power_right",
        name="Potência de Finalização (Direita)",
        category="Technical",
        description="Potência média dos chutes de perna direita.",
        primary_tests=(
            "Shot Power (No Run-Up, Right Foot)",
            "Shot Power (Run-Up, Right Foot)",
        ),
        calculation=(
            "Calcular média e pico (km/h) entre tentativas com e sem corrida."
        ),
        direction="higher_is_better",
        tags=("finalizacao", "perna_direita"),
    ),
    MetricDefinition(
        id="shoot_power_left",
        name="Potência de Finalização (Esquerda)",
        category="Technical",
        description="Potência média dos chutes de perna esquerda.",
        primary_tests=(
            "Shot Power (No Run-Up, Left Foot)",
            "Shot Power (Run-Up, Left Foot)",
        ),
        calculation=(
            "Mesma abordagem da direita; gera base para analisar simetria."
        ),
        direction="higher_is_better",
        tags=("finalizacao", "perna_esquerda"),
    ),
    MetricDefinition(
        id="shoot_accuracy_right",
        name="Precisão de Finalização (Direita)",
        category="Technical",
        description="Consistência de acerto com a perna dominante (direita).",
        primary_tests=(
            "10 m Accuracy Kick (Right Foot, 5 attempts)",
            "15 m Driven Shot (Right Foot, 5 attempts)",
            "25 m Driven Shot (Right Foot, 5 attempts)",
            "35 m Driven Shot (Right Foot, 5 attempts)",
        ),
        calculation=(
            "Transformar acertos em % por distância e calcular média ponderada "
            "com maior peso para distâncias longas."
        ),
        direction="higher_is_better",
        tags=("finalizacao", "precisao"),
    ),
    MetricDefinition(
        id="shoot_accuracy_left",
        name="Precisão de Finalização (Esquerda)",
        category="Technical",
        description="Consistência de acerto com a perna não dominante (esquerda).",
        primary_tests=(
            "10 m Accuracy Kick (Left Foot, 5 attempts)",
            "15 m Driven Shot (Left Foot, 5 attempts)",
            "25 m Driven Shot (Left Foot, 5 attempts)",
            "35 m Driven Shot (Left Foot, 5 attempts)",
        ),
        calculation=(
            "Mesma ponderação utilizada para a perna direita para facilitar "
            "comparações."
        ),
        direction="higher_is_better",
        tags=("finalizacao", "precisao"),
    ),
    MetricDefinition(
        id="cross_accuracy_right",
        name="Precisão de Cruzamentos (Direita)",
        category="Technical",
        description="Qualidade do serviço lateral com perna direita.",
        primary_tests=(
            "25 m Wing Delivery to Runner (Low, Right Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (Mid, Right Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (High, Right Foot, 5 attempts)",
        ),
        calculation=(
            "Calcular % de acerto por altura e gerar média; reportar variação "
            "para identificar melhor faixa de cruzamento."
        ),
        direction="higher_is_better",
        tags=("cruzamento", "perna_direita"),
    ),
    MetricDefinition(
        id="cross_accuracy_left",
        name="Precisão de Cruzamentos (Esquerda)",
        category="Technical",
        description="Qualidade do serviço lateral com perna esquerda.",
        primary_tests=(
            "25 m Wing Delivery to Runner (Low, Left Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (Mid, Left Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (High, Left Foot, 5 attempts)",
        ),
        calculation=(
            "Mesma estrutura da perna direita; facilita análise de lateralidade."
        ),
        direction="higher_is_better",
        tags=("cruzamento", "perna_esquerda"),
    ),
    MetricDefinition(
        id="two_footedness_index",
        name="Índice de Bi-dominância",
        category="Technical",
        description="Equilíbrio entre pés em potência e precisão ofensiva.",
        primary_tests=(
            "Shot Power (Run-Up, Right Foot)",
            "Shot Power (Run-Up, Left Foot)",
            "35 m Driven Shot (Right Foot, 5 attempts)",
            "35 m Driven Shot (Left Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (High, Right Foot, 5 attempts)",
            "25 m Wing Delivery to Runner (High, Left Foot, 5 attempts)",
        ),
        calculation=(
            "Calcular diferença relativa entre pés (% diferença média) e "
            "subtrair de 100 para obter índice (0 = totalmente unilateral, "
            "100 = perfeito equilíbrio)."
        ),
        direction="higher_is_better",
        tags=("lateralidade", "simetria"),
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

