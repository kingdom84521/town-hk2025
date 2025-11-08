<template>
  <button class="floating-button" :class="{ active: isActive }" @click="toggleClick" title="回報狀況">
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <!-- 報告/信號圖標 -->
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  </button>
</template>

<script setup>
import { ref } from 'vue';

const isActive = ref(false);

const emit = defineEmits(['click']);

const toggleClick = () => {
  isActive.value = !isActive.value;
  emit('click');
};
</script>

<style scoped>
.floating-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 0, 0, 0.4);
  z-index: 100;
  font-size: 24px;
}

.floating-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(255, 0, 0, 0.5);
}

.floating-button:active {
  transform: scale(0.95);
}

.floating-button.active {
  background: linear-gradient(135deg, #cc0000 0%, #990000 100%);
  animation: pulse-ring 0.6s ease-out;
}

.button-icon {
  width: 28px;
  height: 28px;
}

.floating-button.active .button-icon {
  animation: none;
}

.pulse-dot {
  animation: blink 1.5s ease-in-out infinite;
}

.floating-button.active .pulse-dot {
  animation: pulse 0.6s ease-out;
}

/* 動畫 */
@keyframes float {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-5px);
  }
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
  }

  50% {
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
}

@keyframes blink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.3;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.3);
  }

  100% {
    transform: scale(1);
  }
}

/* 移動設備優化 */
@media (max-width: 600px) {
  .floating-button {
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
  }

  .button-icon {
    width: 24px;
    height: 24px;
  }
}
</style>
