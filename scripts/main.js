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
 * global.fcell.filters.push(
 *     liq => liq.name !== "test-liquid-1"),
 *     liq => liq.name !== "test-liquid-2"),
 *     liq => liq.name !== "test-liquid-3"),
 * );
 */




/* <------------------------------ definition ------------------------------> */




global.fcell = global.fcell || {};
global.fcell.filters = global.fcell.filters || [];




/**
 * Whether the fluid cell for some fluid has been created.
 * @param {Liquid} liq
 * @return {boolean}
 */
global.fcell.hasCell = function(liq) {
    return fluidItemMap.containsKey(liq);
};


/**
 * Whether some item is a fluid cell.
 * @param {Item} item
 * @return {boolean}
 */
global.fcell.isCell = function(item) {
    return item.ex_getFluid != null;
};


/**
 * Gets cell item of some fluid.
 * @param {Liquid} liq
 * @return {Item|null}
 */
global.fcell.getCell = function(liq) {
    return fluidItemMap.get(liq);
};


/**
 * Gets all cell items.
 * @return {Seq<Item>}
 */
global.fcell.getCells = function() {
    return allItems;
};


/**
 * Gets all liquid cell items.
 * @return {Seq<Item>}
 */
global.fcell.getLiquidCells = function() {
    return liqItems;
};


/**
 * Gets all gas cell items.
 * @return {Seq<Item>}
 */
global.fcell.getGasCells = function() {
    return gasItems;
};


/**
 * Iterates through each fluid-cell pair.
 * @param {(liq: Liquid, item: Item) => void} scr
 * @return {void}
 */
global.fcell.eachPair = function(scr) {
    fluidItemMap.each(scr);
};




/* <------------------------------ code part ------------------------------> */




const allItems = new Seq();
const liqItems = new Seq();
const gasItems = new Seq();
const fluidItemMap = new ObjectMap();
const hasLovec = Vars.mods.locateMod("lovec") != null;
const isV8 = Version.number < 9;




global.fcell.filters.push(
    // Empty array causes bug, at least one filter should exist
    liq => true,
    // Abstract fluids from Lovec should not have cells
    !hasLovec ? null : liq => !MDL_cond.isAuxiliaryFluid(liq),
    // Pressure from Asthosus should not have cell
    liq => liq.name !== "asthosus-02b-01-pressure",
);




function timeRunV8(delay, scr) {
    Time.run(delay, scr);
};
function timeRunV9(delay, scr) {
    Vars.state.run(delay, scr);
};
function timeRun(delay, scr) {
    isV8 ?
        timeRunV8(delay, scr) :
        timeRunV9(delay, scr);
};




Log.info("[FCELL] Creating fluid items...");
let itemCount = 0;
let hiddenItemCount = 0;
Vars.content.liquids().each(
    liq => global.fcell.filters.every(boolF => boolF(liq)),
    liq => {
        let item = extend(Item, "cell-" + liq.name, {


            hidden: liq.hidden,
            databaseTag: "fcell-cell",
            cellContent: liq,


            init() {
                this.super$init();

                Events.run(ClientLoadEvent, () => timeRun(4.0, () => {
                    this.flammability = this.cellContent.flammability;
                    this.explosiveness = this.cellContent.explosiveness;
                    this.color = this.cellContent.color;

                    this.shownPlanets.addAll(this.cellContent.shownPlanets);
                    this.databaseTabs.addAll(this.cellContent.databaseTabs);
                }));

                if(!Vars.headless && !Core.bundle.has("item." + this.name + ".name")) {
                    // If not bundled, generate name based on the fluid name
                    Events.run(ClientLoadEvent, () => timeRun(6.0, () => {
                        this.localizedName = Core.bundle.get("term.fcell-term-fluid-cell.name") + " " + this.cellContent.localizedName;
                    }));
                };
            },


            loadIcon() {
                this.super$loadIcon();
                Events.run(ClientLoadEvent, () => {
                    this.fullIcon = this.uiIcon = Core.atlas.find(this.name + "-gen");
                });
            },


            createIcons(packer) {
                this.self.ex_createIcons(packer);
            },


            packSprites(packer) {
                this.self.ex_createIcons(packer);
            },


            ex_createIcons(packer) {
                // If the fluid has "-cell" and "-cell-fluid" sprites, use them instead
                // If the mod has "<modname>-liquid-cell" and "<modname>-gas-cell" sprites (same for "-cell-fluid"), also use them instead
                let nameMod = this.cellContent.minfo.mod == null ? null : this.cellContent.minfo.mod.name;
                let pixCont;
                if(packer.has(this.cellContent.name + "-cell")) {
                    pixCont = packer.get(this.cellContent.name + "-cell");
                } else {
                    if(!this.cellContent.gas) {
                        pixCont = packer.get(packer.has(nameMod + "-liquid-cell") ? (nameMod + "-liquid-cell") : "fcell-liquid-cell");
                    } else {
                        pixCont = packer.get(packer.has(nameMod + "-gas-cell") ? (nameMod + "-liquid-cell") : "fcell-gas-cell");
                    };
                };
                let pixFld;
                if(packer.has(this.cellContent.name + "-cell-fluid")) {
                    pixFld = packer.get(this.cellContent.name + "-cell-fluid");
                } else {
                    if(!this.cellContent.gas) {
                        pixFld = packer.get(packer.has(nameMod + "-liquid-cell-fluid") ? (nameMod + "-liquid-cell-fluid") : "fcell-liquid-cell-fluid");
                    } else {
                        pixFld = packer.get(packer.has(nameMod + "-gas-cell-fluid") ? (nameMod + "-liquid-cell-fluid") : "fcell-gas-cell-fluid");
                    };
                };
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
                    if(hasLovec && packer.has(this.cellContent.name)) {
                        let rawColors = MDL_color.getPixColors(packer.get(this.cellContent.name));
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

                isV8 ?
                    packer.add(eval("MultiPacker.PageType.main"), this.name + "-gen", pix) :
                    packer.add(this.name + "-gen", pix);
                pixFldRecolor.dispose();
                pix.dispose();
            },


            ex_getFluid() {
                return this.cellContent;
            },


        });


        Core.app.post(() => {
            allItems.add(item);
            (!liq.gas ? liqItems : gasItems).add(item);
            fluidItemMap.put(liq, item);
        });

        itemCount++;
        if(item.hidden) {
            hiddenItemCount++;
        };
    },
);
Log.info("[FCELL] Created [#ffd37f]" + itemCount + "[] item(s), [#ffd37f]" + hiddenItemCount + "[] of which are hidden.");




if(hasLovec) {
    Core.app.post(() => {
        MDL_util.localizeModMeta("fcell");
    });
};
