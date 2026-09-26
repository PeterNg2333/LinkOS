<script setup lang="ts">
import { ref, onMounted  } from 'vue'

import apiClient from '@/api'


const pingRes = ref<number>(0)

const fetchPing = async () => {
  const rpc = await apiClient()
  const reply = await rpc.demo.ping()
  if (reply === 'pong') {
    pingRes.value += 1
  } else {
    pingRes.value -= 1
  }
}
</script>

<template>
  <p>Ping says: <strong>{{ pingRes }}</strong></p>
  <button @click="fetchPing">Fetch Ping</button>
</template>
