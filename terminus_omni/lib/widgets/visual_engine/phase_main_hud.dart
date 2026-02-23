import 'package:flutter/material.dart';
import 'effects/dripping_code_painter.dart';
import 'effects/entropy_graph_painter.dart';
import 'effects/grid_compression_painter.dart';
import 'effects/rusted_border_painter.dart';
import 'effects/scanline_shader.dart';

/// Phase 2: Main HUD — active gameplay.
/// Central monitor with entropy graph + grid, flanked by 10 candles.
class PhaseMainHUD extends StatefulWidget {
  final int lumenCount;
  final double entropyValue;
  final double coherenceValue;

  const PhaseMainHUD({
    super.key,
    required this.lumenCount,
    required this.entropyValue,
    required this.coherenceValue,
  });

  @override
  State<PhaseMainHUD> createState() => _PhaseMainHUDState();
}

class _PhaseMainHUDState extends State<PhaseMainHUD>
    with TickerProviderStateMixin {
  late AnimationController _loopController;
  late List<AnimationController> _candleControllers;

  @override
  void initState() {
    super.initState();

    _loopController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 60),
    )..repeat();

    // 10 independent candle flicker controllers
    _candleControllers = List.generate(10, (i) {
      return AnimationController(
        vsync: this,
        duration: Duration(milliseconds: 300 + i * 50),
      )..repeat(reverse: true);
    });
  }

  @override
  void dispose() {
    _loopController.dispose();
    for (final c in _candleControllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _loopController,
      builder: (context, _) {
        return Stack(
          children: [
            // Background
            const ColoredBox(
              color: Color(0xFF0A0A0A),
              child: SizedBox.expand(),
            ),

            // Subtle dripping code behind
            Positioned.fill(
              child: CustomPaint(
                painter: DrippingCodePainter(
                  progress: _loopController.value,
                  lumenCount: widget.lumenCount,
                ),
              ),
            ),

            // Central monitor panel
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600, maxHeight: 500),
                child: CustomPaint(
                  painter: RustedBorderPainter(
                    decay: (1.0 - widget.lumenCount / 10.0).clamp(0.0, 1.0),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        // Entropy graph
                        Expanded(
                          flex: 3,
                          child: CustomPaint(
                            painter: EntropyGraphPainter(
                              entropy: widget.entropyValue,
                              coherence: widget.coherenceValue,
                              time: _loopController.value,
                            ),
                            size: Size.infinite,
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Grid 6x6
                        Expanded(
                          flex: 2,
                          child: CustomPaint(
                            painter: GridCompressionPainter(
                              lumenCount: widget.lumenCount,
                              time: _loopController.value,
                            ),
                            size: Size.infinite,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // 5 candles on the left
            Positioned(
              left: 24,
              top: 0,
              bottom: 0,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(5, (i) => _buildCandle(i)),
                ),
              ),
            ),

            // 5 candles on the right
            Positioned(
              right: 24,
              top: 0,
              bottom: 0,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(5, (i) => _buildCandle(i + 5)),
                ),
              ),
            ),

            // Scanline overlay
            const Positioned.fill(
              child: IgnorePointer(child: ScanlineShader(intensity: 0.2)),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCandle(int index) {
    final isLit = index < widget.lumenCount;

    return AnimatedBuilder(
      animation: _candleControllers[index],
      builder: (context, _) {
        final flicker =
            isLit ? (0.7 + _candleControllers[index].value * 0.3) : 0.15;

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isLit
                  ? Color(0xFFFF8C00).withValues(alpha: flicker)
                  : const Color(0xFF1A1A1A),
              boxShadow: isLit
                  ? [
                      BoxShadow(
                        color: Color(0xFFFF8C00)
                            .withValues(alpha: flicker * 0.5),
                        blurRadius: 14,
                        spreadRadius: 3,
                      ),
                    ]
                  : null,
            ),
          ),
        );
      },
    );
  }
}
