import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app.dart';
import 'services/storage_service.dart';

/// Viaggio al Centro del Cuore
/// Journey to the Center of the Heart
///
/// An interactive narrative experience aboard the dying starship TERMINUS.
/// Built by Ethic Software Foundation.
///
/// "The descent into the Earth becomes the descent into the Heart."
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait — the terminal is vertical
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  // Full immersion: hide system UI overlays
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.black,
    ),
  );

  // Initialize storage
  final prefs = await SharedPreferences.getInstance();
  final storage = StorageService(prefs);

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storage),
      ],
      child: const ViaggioApp(),
    ),
  );
}
