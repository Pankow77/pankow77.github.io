import 'package:flutter/material.dart';

/// Hybrid Syndicate cyberpunk aesthetic — REDESIGNED.
///
/// Inspired by the Hybrid Syndicate branding: rich metallic textures,
/// industrial depth, layered glow, circuit-board patterns.
/// No more flat terminal. This is premium dark UI.
class TerminusTheme {
  TerminusTheme._();

  // ── Core palette ──
  static const Color bgDeep = Color(0xFF040810);
  static const Color bgPanel = Color(0xFF0A1424);
  static const Color bgCard = Color(0xFF0E1A30);
  static const Color bgSurface = Color(0xFF121E38);
  static const Color border = Color(0xFF1A2E50);
  static const Color borderLight = Color(0xFF243A60);

  // ── Neon accents ──
  static const Color neonCyan = Color(0xFF00E8FF);
  static const Color neonGreen = Color(0xFF39FF14);
  static const Color neonRed = Color(0xFFFF003C);
  static const Color neonOrange = Color(0xFFFF6600);
  static const Color neonGold = Color(0xFFFFAA00);
  static const Color neonPurple = Color(0xFFA855F7);

  // ── Metallic / Industrial ──
  static const Color metalGold = Color(0xFFD4A028);
  static const Color metalCopper = Color(0xFFB87333);
  static const Color metalSteel = Color(0xFF8899AA);
  static const Color metalBronze = Color(0xFF9C6B30);

  // ── Text colors ──
  static const Color textPrimary = Color(0xFFE4ECF4);
  static const Color textDim = Color(0xFF5A6E84);
  static const Color textSecondary = Color(0xFF8CA0B8);
  static const Color textGlow = Color(0xFFCCE0F0);

  // ── Lumen colors: from warm hope to cold death ──
  static const List<Color> lumenGradient = [
    Color(0xFFFF003C), // 0 - death
    Color(0xFFFF1A1A), // 1
    Color(0xFFFF4400), // 2
    Color(0xFFFF6600), // 3
    Color(0xFFFF8800), // 4
    Color(0xFFFFAA00), // 5
    Color(0xFFFFCC00), // 6
    Color(0xFFCCFF00), // 7
    Color(0xFF88FF00), // 8
    Color(0xFF39FF14), // 9
    Color(0xFF00E8FF), // 10 - full light
  ];

  static Color lumenColor(int lumen) =>
      lumenGradient[lumen.clamp(0, 10)];

  // ── Text styles ──
  static const String fontDisplay = 'Orbitron';
  static const String fontMono = 'ShareTechMono';

  static TextStyle displayLarge = const TextStyle(
    fontFamily: fontDisplay,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    color: neonCyan,
    letterSpacing: 4,
    shadows: [
      Shadow(color: Color(0x8000E8FF), blurRadius: 20),
      Shadow(color: Color(0x4000E8FF), blurRadius: 40),
    ],
  );

  static TextStyle displayMedium = const TextStyle(
    fontFamily: fontDisplay,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: neonCyan,
    letterSpacing: 3,
    shadows: [
      Shadow(color: Color(0x6000E8FF), blurRadius: 12),
    ],
  );

  static TextStyle displaySmall = const TextStyle(
    fontFamily: fontDisplay,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: textPrimary,
    letterSpacing: 2,
  );

  static TextStyle narrative = const TextStyle(
    fontFamily: fontMono,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: textPrimary,
    height: 1.7,
    letterSpacing: 0.3,
  );

  static TextStyle narrativeItalic = const TextStyle(
    fontFamily: fontMono,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    fontStyle: FontStyle.italic,
    color: textSecondary,
    height: 1.7,
  );

  static TextStyle systemLog = const TextStyle(
    fontFamily: fontMono,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: neonGreen,
    letterSpacing: 1,
  );

  static TextStyle buttonText = const TextStyle(
    fontFamily: fontDisplay,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 2,
  );

  static TextStyle labelText = const TextStyle(
    fontFamily: fontMono,
    fontSize: 11,
    fontWeight: FontWeight.w400,
    color: metalGold,
    letterSpacing: 2,
  );

  // ── Gradient presets ──
  static const LinearGradient bgGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFF060C18),
      Color(0xFF0A1428),
      Color(0xFF0E1A34),
      Color(0xFF081020),
    ],
    stops: [0.0, 0.3, 0.7, 1.0],
  );

  static LinearGradient get panelGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          bgCard,
          bgPanel.withValues(alpha: 0.8),
          bgCard,
        ],
      );

  static const LinearGradient goldAccent = LinearGradient(
    colors: [
      Color(0xFF8A6914),
      Color(0xFFD4A028),
      Color(0xFFF0C848),
      Color(0xFFD4A028),
      Color(0xFF8A6914),
    ],
    stops: [0.0, 0.3, 0.5, 0.7, 1.0],
  );

  static LinearGradient get cyanGlow => LinearGradient(
        colors: [
          Colors.transparent,
          neonCyan.withValues(alpha: 0.4),
          neonCyan.withValues(alpha: 0.6),
          neonCyan.withValues(alpha: 0.4),
          Colors.transparent,
        ],
        stops: const [0.0, 0.2, 0.5, 0.8, 1.0],
      );

  static LinearGradient get redGlow => LinearGradient(
        colors: [
          Colors.transparent,
          neonRed.withValues(alpha: 0.3),
          neonRed.withValues(alpha: 0.5),
          neonRed.withValues(alpha: 0.3),
          Colors.transparent,
        ],
        stops: const [0.0, 0.2, 0.5, 0.8, 1.0],
      );

  // ── Decoration helpers ──

  /// Rich panel decoration with depth, inner glow, and border.
  static BoxDecoration richPanel({
    Color? accentColor,
    double borderWidth = 1.5,
    double radius = 8,
  }) {
    final accent = accentColor ?? border;
    return BoxDecoration(
      gradient: panelGradient,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: accent.withValues(alpha: 0.4),
        width: borderWidth,
      ),
      boxShadow: [
        BoxShadow(
          color: accent.withValues(alpha: 0.1),
          blurRadius: 16,
          spreadRadius: -2,
        ),
        const BoxShadow(
          color: Color(0xCC000000),
          blurRadius: 24,
          spreadRadius: -4,
          offset: Offset(0, 4),
        ),
      ],
    );
  }

  /// Elevated button decoration with neon glow.
  static BoxDecoration neonButton({
    required Color color,
    bool isPressed = false,
    double radius = 8,
  }) {
    return BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          color.withValues(alpha: isPressed ? 0.25 : 0.15),
          color.withValues(alpha: isPressed ? 0.15 : 0.06),
        ],
      ),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: color.withValues(alpha: isPressed ? 0.7 : 0.4),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: color.withValues(alpha: isPressed ? 0.25 : 0.12),
          blurRadius: isPressed ? 20 : 12,
          spreadRadius: isPressed ? 0 : -2,
        ),
        if (isPressed)
          BoxShadow(
            color: color.withValues(alpha: 0.1),
            blurRadius: 32,
            spreadRadius: 0,
          ),
      ],
    );
  }

  /// Glowing separator line.
  static Widget glowLine({
    Color? color,
    double width = 200,
    double height = 2,
  }) {
    final c = color ?? neonCyan;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(1),
        gradient: LinearGradient(
          colors: [
            Colors.transparent,
            c.withValues(alpha: 0.3),
            c.withValues(alpha: 0.6),
            c.withValues(alpha: 0.3),
            Colors.transparent,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: c.withValues(alpha: 0.3),
            blurRadius: 8,
            spreadRadius: 0,
          ),
        ],
      ),
    );
  }

  // ── Theme data ──
  static ThemeData get dark => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: bgDeep,
        colorScheme: const ColorScheme.dark(
          primary: neonCyan,
          secondary: neonOrange,
          surface: bgPanel,
          error: neonRed,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        textTheme: TextTheme(
          headlineLarge: displayLarge,
          headlineMedium: displayMedium,
          bodyLarge: narrative,
          bodySmall: systemLog,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF0A1220),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: border.withValues(alpha: 0.6)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: border.withValues(alpha: 0.6)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: neonCyan, width: 1.5),
          ),
          labelStyle: const TextStyle(
            fontFamily: fontMono,
            color: textDim,
            fontSize: 13,
            letterSpacing: 1,
          ),
          hintStyle: const TextStyle(
            fontFamily: fontMono,
            color: textDim,
            fontSize: 13,
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: neonCyan.withValues(alpha: 0.12),
            foregroundColor: neonCyan,
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: BorderSide(color: neonCyan.withValues(alpha: 0.3)),
            ),
            textStyle: buttonText,
            elevation: 0,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: neonCyan,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 28),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            textStyle: buttonText,
          ),
        ),
      );
}
