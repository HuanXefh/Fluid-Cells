# Fluid Cells

Generates fluid items for all fluids in game, including those added by other mods.

This mod alone **DOES NOT** add any recipe, even an empty cell!

<br>

## Spriting

This mod generates item sprites based on `liquid.gas` and `liquid.color`. You don't have to draw sprites for those items.

If you want to have particular sprites used for a fluid, name them like:

1. **"\<fluidname>-cell"**: For casing sprite.

2. **"\<fluidname>-cell-fluid"**: For inner fluid sprite, expected to be white only.

If you want to have particular sprites for all fluids from your mod:

1. **"liquid-cell"**: Same as "-cell". **"gas-cell"** for gases.

2. **"liquid-cell-fluid"**: Same as "-cell-fluid". **"gas-cell-fluid"** for gases.

<br>

## Item name

Names are generated for these items like **"Cell: \<fluidname>"**. However, it's still possible to assign the localized name with bundle files:

```
item.fcell-cell-<modname>-<fluidname>.name = Your Item Name Here
item.fcell-cell-<modname>-<fluidname>.description = Your item description here.
```

<br>

## Filtering out special fluids

You can prevent generation of items for some fluids in your mod by a script:

```js
// Keep existing values
global.fcell = global.fcell || {};
global.fcell.filters = global.fcell.filters || [];

// Register new filters
// If the arrow function returns false, item generation will be skipped for this liquid
global.fcell.filters.push(liquid => liquid.name !== "test-liquid");
// If your mod requires FCell, you can call a method instead for batch definition
global.fcell.addFilter(
  liquid => liquid.name !== "test-liquid-1",
  liquid => liquid.name !== "test-liquid-2",
  liquid => liquid.name !== "test-liquid-3",
);
```

<br>

## Relation to LovecLib

This mod **DOES NOT** require [LovecLib](https://github.com/HuanXefh/Lovecraftian-Library-Java) as a dependency.
