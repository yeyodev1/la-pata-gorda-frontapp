<script setup lang="ts">
import { computed } from 'vue'
import { statusBadge } from '@/utils/format'
const props = defineProps<{ map: Record<string, { label: string; cls: string }>; value: string }>()
const b = computed(() => statusBadge(props.map, props.value))
</script>
<template><span class="badge" :class="b.cls">{{ b.label }}</span></template>
