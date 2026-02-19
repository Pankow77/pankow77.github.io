/// App-wide constants for Viaggio al Centro del Cuore.
class AppConstants {
  AppConstants._();

  // --- Identity ---
  static const String appName = 'Viaggio al Centro del Cuore';
  static const String appNameEn = 'Journey to the Center of the Heart';
  static const String shipName = 'TERMINUS';
  static const String systemVersion = '3.7.1';

  // --- Lumen System ---
  static const int lumenMax = 10;
  static const int lumenMin = 0;
  static const int ghostAppearThreshold = 5;
  static const int reactorCriticalThreshold = 2;

  // --- Act Boundaries ---
  static const int actIEnd = 7;     // Act I: Lumen 10-7
  static const int actIIEnd = 3;    // Act II: Lumen 6-3
  // Act III: Lumen 2-0

  // --- Timing (milliseconds) ---
  static const int typewriterCharDelay = 35;
  static const int typewriterLineDelay = 200;
  static const int bootLineDelay = 400;
  static const int bootWarningDelay = 800;
  static const int crewRestMinimumMs = 3600000; // 1 hour

  // --- Safety ---
  static const int maxMessagesBeforeCheck = 50;

  // --- LLM ---
  static const int maxContextMessages = 100;
  static const int maxResponseTokens = 1024;
  static const double defaultTemperature = 0.85;

  // --- System Failures (one per Lumen lost) ---
  static const List<String> systemFailures = [
    'All systems nominal',                    // Lumen 10
    'Communications array offline',           // Lumen 9
    'External sensors destroyed',             // Lumen 8
    'Secondary lighting failure',             // Lumen 7
    'Life support degraded — 67%',            // Lumen 6
    'Navigation systems destroyed',           // Lumen 5
    'Primary lighting failure',               // Lumen 4
    'Hull breach — Section 7 sealed',         // Lumen 3
    'REACTOR INTEGRITY CRITICAL',             // Lumen 2
    'All systems failing',                    // Lumen 1
    'Reactor meltdown — TERMINUS lost',       // Lumen 0
  ];
}
