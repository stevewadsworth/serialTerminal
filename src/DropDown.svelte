<script>
  import { onMount } from "svelte";

  export let items = [];

  export let value;

  $: console.log(items);

  onMount(async function() {
    console.log(items)
  })
</script>

<style>
select {
  margin: 0.5rem;
}
</style>

<select bind:value={value}>
  {#each items as item}
    <option value={item}>
      {item}
    </option>
  {/each}
</select>
