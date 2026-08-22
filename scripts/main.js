/**
 * About the mod:
 *
 * This mod generates fluid items for other enabled mods.
 * No recipes added.
 */


/**
 * How to filter valid contents:
 *
 * You may want some fluids not to have item counterparts, which can be done with filters.
 * You can push filters into `global.fcell.filters` to disable item generation for some fluids.
 * Remember to perform a null check to keep values set by previous mods.
 * @example
 * global.fcell = global.fcell || {};
 * global.fcell.filters = global.fcell.filters || [];
 *
 * // Approach 1
 * global.fcell.filters.push(liq => liq.name !== "test-liquid-1");
 * global.fcell.filters.push(liq => liq.name !== "test-liquid-2");
 * global.fcell.filters.push(liq => liq.name !== "test-liquid-3");
 *
 * // Approach 2 (FCell must be your mods' dependency)
 * global.fcell.addFilter(
 *   liq => liq.name !== "test-liquid-1",
 *   liq => liq.name !== "test-liquid-2",
 *   liq => liq.name !== "test-liquid-3",
 * );
 */




/* <------------------------------ code part ------------------------------ */




global.fcell = global.fcell || {};
global.fcell.filters = global.fcell.filters || [];
global.fcell.items = new Seq();
global.fcell.liquidItems = new Seq();
global.fcell.gasItems = new Seq();
global.fcell.fluidItemMap = new ObjectMap();

const HAS_LOVEC = Vars.mods.locateMod("lovec") != null;




/**
 * Registers new valid cell content filters.
 * `ARGS`: filter1, filter2, filter3, ...
 * @return {void}
 */
global.fcell.addFilter = function() {
  Array.from(arguments).forEach(filter => {
    if(typeof filter !== "function") return;
    global.fcell.filters.push(filter);
  });
};


/**
 * Gets cell item of some fluid.
 * @param {Liquid} liq
 * @return {Item|null}
 */
global.fcell.getCellItem = function(liq) {
  return global.fcell.fluidItemMap.get(liq);
};




global.fcell.addFilter(

  // Empty array causes bug, at least one filter should exist
  liq => true,

  // Abstract fluids from Lovec should not have cells
  !HAS_LOVEC ? null : liq => !MDL_cond.isAuxiliaryFluid(liq),

  // Pressure from Asthosus should not have cell
  liq => liq.name !== "asthosus-02b-01-pressure",

);




Events.run(ModContentLoadEvent, () => {


  Log.info("[FCELL] Creating fluid items...");


  let itmCount = 0;
  let hiddenItmCount = 0;
  let modPrev = Reflect.get(ContentLoader, Vars.content, "currentMod");


  Reflect.set(ContentLoader, Vars.content, "currentMod", Vars.mods.locateMod("fcell"));
  Vars.content.liquids().each(
    liq => global.fcell.filters.every(boolF => boolF(liq)),
    liq => {
      let itm = extend(Item, "cell-" + liq.name, {


        hidden: liq.hidden,
        databaseTag: "fcell-cell",
        cellContent: liq,


        init() {
          this.super$init();

          Events.run(ClientLoadEvent, () => Time.runTask(4.0, () => {
            this.flammability = this.cellContent.flammability;
            this.explosiveness = this.cellContent.explosiveness;
            this.color = this.cellContent.color;

            this.shownPlanets.addAll(this.cellContent.shownPlanets);
            this.databaseTabs.addAll(this.cellContent.databaseTabs);
          }));

          if(!Vars.headless && !Core.bundle.has("item." + this.name + ".name")) {
            // If not bundled, generate name based on the fluid name
            Events.run(ClientLoadEvent, () => Time.runTask(6.0, () => {
              this.localizedName = Core.bundle.get("term.fcell-term-fluid-cell.name") + " " + this.cellContent.localizedName;
            }));
          };
        },


        loadIcon() {
          this.fullIcon = this.uiIcon = Core.atlas.find(this.name + "-gen");
        },


        createIcons(packer) {
          // If the fluid has "-cell" and "-cell-fluid" sprites, use them instead
          // If the mod has "<modname>-liquid-cell" and "<modname>-gas-cell" sprites (same for "-cell-fluid"), also use them instead
          let nameMod = this.cellContent.minfo.mod == null ? null : this.cellContent.minfo.mod.name;
          let pixCont = Core.atlas.getPixmap(
            Core.atlas.has(this.cellContent.name + "-cell") ?
              Core.atlas.getPixmap(this.cellContent.name + "-cell") :
              !this.cellContent.gas ?
                (
                  Core.atlas.has(nameMod + "-liquid-cell") ?
                    Core.atlas.getPixmap(nameMod + "-liquid-cell") :
                    "fcell-liquid-cell"
                ) :
                (
                  Core.atlas.has(nameMod + "-gas-cell") ?
                    Core.atlas.getPixmap(nameMod + "-gas-cell") :
                    "fcell-gas-cell"
                )
          );
          let pixFld = Core.atlas.getPixmap(
            Core.atlas.has(this.cellContent.name + "-cell-fluid") ?
              Core.atlas.getPixmap(this.cellContent.name + "-cell-fluid") :
              !this.cellContent.gas ?
                (
                  Core.atlas.has(nameMod + "-liquid-cell-fluid") ?
                    Core.atlas.getPixmap(nameMod + "-liquid-cell-fluid") :
                    "fcell-liquid-cell-fluid"
                ) :
                (
                  Core.atlas.has(nameMod + "-gas-cell-fluid") ?
                    Core.atlas.getPixmap(nameMod + "-gas-cell-fluid") :
                    "fcell-gas-cell-fluid"
                )
          );

          let pixFldRecolor = new Pixmap(pixFld.width, pixFld.height);
          let pix = new Pixmap(pixCont.width, pixCont.height);

          let
            w = pixFldRecolor.width,
            h = pixFldRecolor.height,
            x = 0,
            y,
            clearRawColor = Color.clear.rgba8888();

          let fldColor = this.cellContent.color;
          if(fldColor.equals(Color.black)) {
            if(HAS_LOVEC && Core.atlas.has(this.cellContent.name)) {
              let rawColors = MDL_color.getPixColors(Core.atlas.getPixmap(this.cellContent.name));
              if(rawColors.length === 0) {
                // Do nothing
              } else if(rawColors.length > 1) {
                fldColor = Tmp.c1.set(rawColors[1]);
              } else {
                fldColor = Tmp.c1.set(rawColors[0]);
              };
            };

            if(fldColor.equals(Color.black)) {
              fldColor = Color.gray;
            };
          };
          let fldRawColor = fldColor.rgba8888();

          while(x < w) {
            y = 0;
            while(y < h) {
              pixFldRecolor.set(x, y, pixFld.getA(x, y) > 0.3 ? fldRawColor : clearRawColor);
              y++;
            };
            x++;
          };

          w = pix.width;
          h = pix.height;
          x = 0;
          while(x < w) {
            y = 0;
            while(y < h) {
              pix.set(x, y, pixCont.getA(x, y) > 0.3 ? pixCont.get(x, y) : pixFldRecolor.get(x, y));
              y++;
            };
            x++;
          };

          packer.add(MultiPacker.PageType.main, this.name + "-gen", pix);
          pixFldRecolor.dispose();
          pix.dispose();
        },


        ex_getFluid() {
          return this.cellContent;
        },


      });


      Core.app.post(() => {
        global.fcell.items.add(itm);
        (!liq.gas ? global.fcell.liquidItems : global.fcell.gasItems).add(itm);
        global.fcell.fluidItemMap.put(liq, itm);
      });

      itmCount++;
      if(itm.hidden) {
        hiddenItmCount++;
      };
    },
  );
  Reflect.set(ContentLoader, Vars.content, "currentMod", modPrev);


  Log.info("[FCELL] Created [#ffd37f]" + itmCount + "[] item(s), [#ffd37f]" + hiddenItmCount + "[] of which are hidden.");


});




if(HAS_LOVEC) Core.app.post(() => {


  MDL_util.localizeModMeta("fcell");


});
