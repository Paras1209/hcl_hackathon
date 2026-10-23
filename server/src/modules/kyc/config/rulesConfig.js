/**
 * Default Rules Configuration
 * Mirrors case_02_rules_config_V1.0.json
 */

const DEFAULT_RULES_CONFIG = {
  min_field_confidence: 0.80,
  name_match_threshold_pass: 0.90,
  name_match_threshold_reject: 0.75,
  watchlist_match_threshold: 0.90,
  watchlist_possible_threshold: 0.80,
  min_age_years: 18,
  pan_pattern: '^[A-Z]{5}[0-9]{4}[A-Z]$',
  pan_holder_type_char: 'P',
  address_proof_max_age_days: 90,
  title_tokens_remove: ['MR', 'MRS', 'MS', 'MISS', 'DR', 'SHRI', 'SMT', 'KUMARI'],
  medium_risk_income_threshold: 2500000,
  rekyc_period_high_years: 2,
  rekyc_period_medium_years: 8,
  rekyc_period_low_years: 10,
  resubmission_window_days: 7,
  checker_sla_hours: 24,
};

module.exports = {
  DEFAULT_RULES_CONFIG,
};
