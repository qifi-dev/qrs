<template>
  <main h-full>
    <div flex flex-col gap-4 px-4 pb-4 pt-4>
      <div flex items-center gap-2 text-4xl>
        <img src="/logo.svg" alt="Qrs" size-1em>
        <h1>
          Qrs
        </h1>
      </div>
      <div h-full flex gap-8>
        <NuxtLink op70 hover="text-blue" duration-300 transition="all ease-in-out" to="/" active-class="!op100" flex="~ items-center gap-1">
          <span i-carbon-upload inline-block />
          Transfer
        </NuxtLink>
        <NuxtLink op70 hover="text-blue" duration-300 transition="all ease-in-out" to="/scan" active-class="!op100" flex="~ items-center gap-1">
          <span i-carbon-download inline-block />
          Receive
        </NuxtLink>

        <a href="https://github.com/qqrss/qrs" target="_blank" op70 hover="text-blue" duration-300 transition="all ease-in-out" flex="~ items-center gap-1">
          <span i-carbon:logo-github inline-block /><span>GitHub</span>
        </a>
      </div>
    </div>
    <slot />
  </main>
</template>
