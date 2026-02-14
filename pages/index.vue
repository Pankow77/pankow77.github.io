<template>
  <div class="min-h-screen bg-black text-yellow-400 font-mono p-6">
    <h1 class="text-4xl mb-4 glitch">HYBRID SYNDICATE TERMINAL</h1>
    <p class="mb-6">Transmission Active // GlitchRaWave Initiated</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-4 border border-yellow-500 hover:bg-yellow-800 transition">Novel</div>
      <div class="p-4 border border-yellow-500 hover:bg-yellow-800 transition">Sound</div>
      <div class="p-4 border border-yellow-500 hover:bg-yellow-800 transition">Visual</div>
    </div>
  </div>
</template>

<style scoped>
.glitch {
  animation: glitch 1s infinite;
}
@keyframes glitch {
  0% { text-shadow: 2px 0 red; }
  20% { text-shadow: -2px 0 blue; }
  40% { text-shadow: 2px 2px green; }
  60% { text-shadow: -2px -2px purple; }
  80% { text-shadow: 2px -2px cyan; }
  100% { text-shadow: 0 0 yellow; }
}
</style>