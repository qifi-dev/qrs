<template>
  <main class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <header class="bg-white shadow-sm dark:bg-gray-800">
      <div class="mx-auto flex items-center justify-between px-4 py-3 container">
        <div class="flex items-center gap-2 text-2xl md:text-3xl">
          <img src="/logo.svg" alt="Qrs" class="h-8 w-8">
          <h1 class="text-gray-800 font-semibold dark:text-white">
            Qrs
          </h1>
        </div>
        <nav class="flex items-center gap-6 text-sm md:text-base">
          <NuxtLink to="/" class="nav-link">
            <span i-carbon-upload class="mr-1 inline-block" />
            {{ $t('nav.transfer') }}
          </NuxtLink>
          <NuxtLink to="/scan" class="nav-link">
            <span i-carbon-download class="mr-1 inline-block" />
            {{ $t('nav.receive') }}
          </NuxtLink>
          <a href="https://github.com/qqrss/qrs" target="_blank" class="nav-link">
            <span i-carbon:logo-github class="mr-1 inline-block" />
            {{ $t('nav.github') }}
          </a>
          <select v-model="$i18n.locale" class="border border-gray-300 rounded bg-white px-2 py-1 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
            <option value="en">
              English
            </option>
            <option value="zh">
              中文
            </option>
          </select>
        </nav>
      </div>
    </header>
    <div class="flex-grow">
      <slot />
    </div>
  </main>
</template>

<style scoped>
.nav-link {
  @apply text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 ease-in-out flex items-center;
}
</style>
