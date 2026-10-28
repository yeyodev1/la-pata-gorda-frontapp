<script setup lang="ts">
/** Cangrejo animado de la marca: se usa mientras carga la tienda y en pantallas de espera. */
withDefaults(defineProps<{ text?: string; size?: number; light?: boolean }>(), { text: 'Preparando el menú…', size: 120, light: false })
</script>
<template>
  <div class="crab-loader" :class="{ light }">
    <svg class="crab" :width="size" :height="size * 0.8" viewBox="0 0 200 160" aria-hidden="true">
      <g class="leg l1"><path d="M60 110 L30 128 L22 148" /></g><g class="leg l2"><path d="M70 118 L48 140 L46 156" /></g><g class="leg l3"><path d="M130 118 L152 140 L154 156" /></g><g class="leg l4"><path d="M140 110 L170 128 L178 148" /></g>
      <g class="claw left"><path d="M62 78 C40 70 24 52 30 34 C36 20 52 20 58 32 L50 44 C46 52 52 60 60 60 Z" /><path class="pincer" d="M58 32 C64 18 80 24 76 40 L66 56 Z" /></g>
      <g class="claw right"><path d="M138 78 C160 70 176 52 170 34 C164 20 148 20 142 32 L150 44 C154 52 148 60 140 60 Z" /><path class="pincer" d="M142 32 C136 18 120 24 124 40 L134 56 Z" /></g>
      <ellipse class="body" cx="100" cy="100" rx="52" ry="36" />
      <g class="eyes"><line x1="84" y1="66" x2="80" y2="50" /><line x1="116" y1="66" x2="120" y2="50" /><circle cx="80" cy="46" r="6" /><circle cx="120" cy="46" r="6" /><circle class="pupil" cx="81" cy="46" r="2.5" /><circle class="pupil" cx="121" cy="46" r="2.5" /></g>
      <path class="smile" d="M86 108 Q100 118 114 108" />
    </svg>
    <p v-if="text">{{ text }}</p>
  </div>
</template>
<style scoped lang="scss">
.crab-loader { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2rem 1rem; color: var(--text-muted); font-weight: 600; &.light { color: var(--cream); } p { margin: 0; font-size: 0.95rem; letter-spacing: 0.02em; animation: fadeText 1.6s ease-in-out infinite; } }
.crab { overflow: visible; animation: scuttle 1.6s ease-in-out infinite; }
.body, .claw path, .eyes circle { fill: var(--red-500); }
.leg path, .eyes line { fill: none; stroke: var(--red-500); stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; }
.pincer { fill: var(--red-600) !important; transform-box: fill-box; transform-origin: 20% 90%; }
.claw.left .pincer { animation: snapL 1.1s ease-in-out infinite; }
.claw.right .pincer { animation: snapR 1.1s ease-in-out infinite 0.25s; }
.claw { transform-box: fill-box; transform-origin: 90% 90%; animation: wave 1.6s ease-in-out infinite; }
.claw.right { transform-origin: 10% 90%; animation-delay: 0.2s; }
.eyes circle:not(.pupil) { fill: #fff; stroke: var(--red-500); stroke-width: 3; }
.pupil { fill: var(--navy-900) !important; }
.smile { fill: none; stroke: var(--navy-900); stroke-width: 4; stroke-linecap: round; opacity: 0.7; }
.leg { transform-box: fill-box; transform-origin: 100% 0%; }
.l1 { animation: legA 0.55s ease-in-out infinite alternate; } .l2 { animation: legA 0.55s ease-in-out infinite alternate 0.15s; } .l3 { transform-origin: 0% 0%; animation: legB 0.55s ease-in-out infinite alternate 0.1s; } .l4 { transform-origin: 0% 0%; animation: legB 0.55s ease-in-out infinite alternate 0.25s; }
@keyframes scuttle { 0%, 100% { transform: translateX(-14px); } 50% { transform: translateX(14px) translateY(-3px); } }
@keyframes wave { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-12deg); } }
@keyframes snapL { 0%, 60%, 100% { transform: rotate(0deg); } 30% { transform: rotate(28deg); } }
@keyframes snapR { 0%, 60%, 100% { transform: rotate(0deg); } 30% { transform: rotate(-28deg); } }
@keyframes legA { from { transform: rotate(-10deg); } to { transform: rotate(10deg); } }
@keyframes legB { from { transform: rotate(10deg); } to { transform: rotate(-10deg); } }
@keyframes fadeText { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .crab, .claw, .pincer, .leg, p { animation: none !important; } }
</style>
