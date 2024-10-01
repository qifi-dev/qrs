<template>
  <main>
    <div flex flex-col items-center gap-4 text-center>
      <h1 text-4xl>
        QR Code Generator
      </h1>
      <div flex gap-5>
        <NuxtLink op70 hover="text-blue" to="/" active-class="!op100">
          Generate
        </NuxtLink>
        <NuxtLink op70 hover="text-blue" to="/scan" active-class="!op100">
          Scan
        </NuxtLink>
      </div>
    </div>
    <slot />
  </main>
</template>
