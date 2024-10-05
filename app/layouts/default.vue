<template>
  <div h-full w-full flex flex-col>
    <header flex flex-col gap-4 px-4 pb-4 pt-4>
      <nav flex items-center>
        <div w-40 flex="~" items-center gap-2 text-4xl>
          <img src="/logo.svg" alt="Qrs" size-1em>
          <h1>
            Qrs
          </h1>
        </div>
        <div
          class="flex sm:hidden"
          left="50%" bottom="40px" translate-x="-50%"
          bg="neutral-100 dark:neutral-900"
          absolute flex-1 justify-center gap-2
          rounded-full
          p-2
          text-sm
        >
          <NuxtLink
            to="/"
            active-class="!op100 bg-neutral-700 dark:bg-neutral-300 !text-neutral-100 !dark:text-neutral-900"
            rounded-full px-3 py-2
            op70 hover="text-blue"
            flex="~ items-center gap-1"
            transition="all ease-in-out" duration-300
          >
            <span i-carbon-upload inline-block />
            Send
          </NuxtLink>
          <NuxtLink
            to="/scan"
            active-class="!op100 bg-neutral-700 dark:bg-neutral-300 !text-neutral-100 !dark:text-neutral-900"
            rounded-full px-3 py-2
            op70 hover="text-blue"
            flex="~ items-center gap-1"
            transition="all ease-in-out" duration-300
          >
            <span i-carbon-download inline-block />
            Receive
          </NuxtLink>
        </div>
        <div
          class="hidden sm:flex"
          flex-1 justify-center gap-8
          text-lg
        >
          <NuxtLink op70 hover="text-blue" duration-300 transition="all ease-in-out" to="/" active-class="!op100" flex="~ items-center gap-1">
            <span i-carbon-upload inline-block />
            Send
          </NuxtLink>
          <NuxtLink op70 hover="text-blue" duration-300 transition="all ease-in-out" to="/scan" active-class="!op100" flex="~ items-center gap-1">
            <span i-carbon-download inline-block />
            Receive
          </NuxtLink>
        </div>
        <div w-40 flex="~ <sm:1" justify-end text-2xl>
          <a href="https://github.com/qqrss/qrs" target="_blank" op70 hover="text-blue" duration-300 transition="all ease-in-out" flex="~ items-center gap-1">
            <span i-carbon:logo-github inline-block />
          </a>
        </div>
      </nav>
    </header>
    <main h-full w-full flex-1>
      <slot />
    </main>
  </div>
</template>
