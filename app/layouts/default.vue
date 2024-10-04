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
        <nav class="flex gap-6 text-sm md:text-base">
          <NuxtLink to="/" class="nav-link">
            <span i-carbon-upload class="mr-1 inline-block" />
            Transfer
          </NuxtLink>
          <NuxtLink to="/scan" class="nav-link">
            <span i-carbon-download class="mr-1 inline-block" />
            Receive
          </NuxtLink>
          <a href="https://github.com/qqrss/qrs" target="_blank" class="nav-link">
            <span i-carbon:logo-github class="mr-1 inline-block" />
            GitHub
          </a>
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
