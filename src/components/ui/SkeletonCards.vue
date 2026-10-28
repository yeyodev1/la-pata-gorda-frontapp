<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'
defineProps<{ count?: number; cols?: 2 | 3 | 4 }>()
</script>
<template>
  <div class="cols" :class="`cols-${cols ?? 4}`" aria-busy="true"><div v-for="i in count ?? 4" :key="i" class="stat"><SkeletonBlock height="0.7rem" width="50%" /><SkeletonBlock height="1.6rem" width="70%" /><SkeletonBlock height="0.7rem" width="85%" /></div></div>
</template>
