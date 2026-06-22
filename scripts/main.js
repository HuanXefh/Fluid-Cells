global.fcell = global.fcell != null ? global.fcell : {};
global.fcell.items = new Seq();
global.fcell.liquidItems = new Seq();
global.fcell.gasItems = new Seq();
global.fcell.filters = global.fcell.filters != null ? global.fcell.filters : [];


const HAS_LOVEC = Vars.mods.locateMod("lovec") != null;


// You can push more filters into `global.fcell.filters` to disable item generation for some fluids
// The null checks here help avoiding overwriting previous values set by other mods
// Code example:
// global.fcell = global.fcell != null ? global.fcell : {};
// global.fcell.filters = global.fcell.filters != null ? global.fcell.filters : [];
// global.fcell.filers.push(liq => yourFilterHere(liq));


// Empty array causes bug
global.fcell.filters.push(liq => true);
if(HAS_LOVEC) {
  // Abstract fluids from LovecLib should not have cells
  global.fcell.filters.push(liq => !MDL_cond._isAuxiliaryFluid(liq));
};


Events.run(ModContentLoadEvent, () => {


  Log.info("[FCELL] Starting creating fluid items.");


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

          Events.run(ClientLoadEvent, () => Time.run(4.0, () => {
            this.flammability = this.cellContent.flammability;
            this.explosiveness = this.cellContent.explosiveness;

            this.shownPlanets.addAll(this.cellContent.shownPlanets);
            this.databaseTabs.addAll(this.cellContent.databaseTabs);
          }));

          if(!Vars.headless && !Core.bundle.has("item." + this.name + ".name")) {
            // If not bundled, generate name based on the fluid name
            Events.run(ClientLoadEvent, () => Time.run(6.0, () => {
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
          let nmMod = this.cellContent.minfo.mod == null ? null : this.cellContent.minfo.mod.name;
          let pixCont = Core.atlas.getPixmap(
            Core.atlas.has(this.cellContent.name + "-cell") ?
              Core.atlas.getPixmap(this.cellContent.name + "-cell") :
              !this.cellContent.gas ?
                (
                  Core.atlas.has(nmMod + "-liquid-cell") ?
                    Core.atlas.getPixmap(nmMod + "-liquid-cell") :
                    "fcell-liquid-cell"
                ) :
                (
                  Core.atlas.has(nmMod + "-gas-cell") ?
                    Core.atlas.getPixmap(nmMod + "-gas-cell") :
                    "fcell-gas-cell"
                )
          );
          let pixFld = Core.atlas.getPixmap(
            Core.atlas.has(this.cellContent.name + "-cell-fluid") ?
              Core.atlas.getPixmap(this.cellContent.name + "-cell-fluid") :
              !this.cellContent.gas ?
                (
                  Core.atlas.has(nmMod + "-liquid-cell-fluid") ?
                    Core.atlas.getPixmap(nmMod + "-liquid-cell-fluid") :
                    "fcell-liquid-cell-fluid"
                ) :
                (
                  Core.atlas.has(nmMod + "-gas-cell-fluid") ?
                    Core.atlas.getPixmap(nmMod + "-gas-cell-fluid") :
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
            if(HAS_LOVEC) {
              let rawColors = MDL_color._pixColors(Core.atlas.getPixmap(this.cellContent.name));
              if(rawColors.length === 0) {
                // Do nothing
              } else if(rawColors.length === 8 && rawColors[0] === -16776961 && rawColors[7] === -1) {
                // Errored (WTF), do nothing
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


      });


      Core.app.post(() => {
        global.fcell.items.add(itm);
        (!liq.gas ? global.fcell.liquidItems : global.fcell.gasItems).add(itm);
      });

      itmCount++;
      if(itm.hidden) {
        hiddenItmCount++;
      };
    },
  );
  Reflect.set(ContentLoader, Vars.content, "currentMod", modPrev);


  Log.info("[FCELL] Created [#ffd37f]" + itmCount + "[] item(s), [#ffd37f]" + hiddenItmCount + "[] item(s) are hidden.");


});
