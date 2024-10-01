<template>
  <main h-full>
    <div flex flex-col gap-4 px-4 pb-2 pt-4>
      <h1 text-4xl>
        QR Code Generator
      </h1>
      <div h-full flex gap-5>
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
