<script setup lang="ts">
defineProps<{ icon?: string; text?: string }>()
</script>
<template><div class="empty"><i class="fa-solid" :class="icon ?? 'fa-inbox'" /><p>{{ text ?? 'Nada por aquí todavía' }}</p><slot /></div></template>
