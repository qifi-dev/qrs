<template>
  <main h-full>
    <div flex flex-col gap-4 px-4 pb-4 pt-4>
      <h1 text-4xl>
        Qrs
      </h1>
      <div h-full flex gap-5>
        <NuxtLink op70 hover="text-blue" duration-300 transition="all ease-in-out" to="/" active-class="!op100">
          Transfer
        </NuxtLink>
        <NuxtLink op70 hover="text-blue" duration-300 transition="all ease-in-out" to="/scan" active-class="!op100">
          Receive
        </NuxtLink>
      </div>
    </div>
    <slot />
  </main>
</template>
