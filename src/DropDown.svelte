<script>
  import { onMount } from "svelte";

  export let items = [];
  export let label = "Choose:";

  export let value;

  onMount(async function() {
    console.log(items)
  })
</script>

<style>
div {
  margin: 0.5rem;
}

select {
  min-width: 3rem;;
}
label {
  font-size: 10px;
}
</style>

<div>
  <label for=list>{label}</label>
  <select id=list bind:value={value}>
    {#each items as item}
      <option value={item}>
        {item}
      </option>
    {/each}
  </select>
</div>
