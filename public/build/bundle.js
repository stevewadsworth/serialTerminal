
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const SerialPort = require('@serialport/stream');
    const Readline = require('@serialport/parser-readline');
    SerialPort.Binding = require('@serialport/bindings');

    const listPorts = async () => {
      const ports = await SerialPort.list();
      for (const port of ports) {
        console.log(`${port.path}\t${port.pnpId || ''}\t${port.manufacturer || ''}`);
      }
      return ports
    };

    const openPort = (path, baudRate, dataBits, parity, stopBits) => {
      const openOptions = {
        baudRate,
        dataBits,
        parity,
        stopBits,
      };

      const port = new SerialPort(path, openOptions);
      port.pipe(process.stdout);
      return port
    };

    const addReadlineParser = (port) => {
      const parser = port.pipe(new Readline({ delimiter: '\n' })); // This works, but only returns data when a full line has been terminated with \n
      return parser;
    };

    var serial = { listPorts, openPort, addReadlineParser };

    /* src/Terminal.svelte generated by Svelte v3.19.1 */

    const { console: console_1 } = globals;
    const file = "src/Terminal.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (69:2) {#each rxData as line}
    function create_each_block(ctx) {
    	let pre;
    	let t_value = /*line*/ ctx[2] + "";
    	let t;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			t = text(t_value);
    			attr_dev(pre, "class", "svelte-1r85u9k");
    			add_location(pre, file, 69, 4, 1429);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rxData*/ 2 && t_value !== (t_value = /*line*/ ctx[2] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(69:2) {#each rxData as line}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div_1;
    	let each_value = /*rxData*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div_1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div_1, "class", "svelte-1r85u9k");
    			add_location(div_1, file, 67, 0, 1378);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div_1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div_1, null);
    			}

    			/*div_1_binding*/ ctx[7](div_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*rxData*/ 2) {
    				each_value = /*rxData*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div_1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div_1);
    			destroy_each(each_blocks, detaching);
    			/*div_1_binding*/ ctx[7](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { config = {} } = $$props;
    	let { localEcho = true } = $$props;
    	let div;
    	let autoscroll;
    	let rxData = [];
    	let acc = [];
    	let line = "";

    	onMount(async function () {
    		const port = serial.openPort(config.path, config.baudRate, config.dataBits, config.parity, config.stopBits);
    		const parser = serial.addReadlineParser(port);

    		parser.on("data", chunk => {
    			acc.push(chunk);
    			$$invalidate(1, rxData = acc);
    		});

    		document.onkeypress = e => {
    			console.log(e);

    			// Auto scroll to the bottom on keypress
    			div.scrollTo(0, div.scrollHeight);

    			let key = e.key;

    			if (e.keyCode === 13) {
    				key = "\n";
    			}

    			port.write(key);

    			if (localEcho) {
    				acc.push(key);
    				$$invalidate(1, rxData = acc);
    			}
    		};
    	});

    	beforeUpdate(() => {
    		// Only scroll if we are at the bottom already
    		autoscroll = div && div.offsetHeight + div.scrollTop > div.scrollHeight - 20;
    	});

    	afterUpdate(() => {
    		if (autoscroll) {
    			div.scrollTo(0, div.scrollHeight);
    		}
    	});

    	const writable_props = ["config", "localEcho"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Terminal> was created with unknown prop '${key}'`);
    	});

    	function div_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, div = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("config" in $$props) $$invalidate(3, config = $$props.config);
    		if ("localEcho" in $$props) $$invalidate(4, localEcho = $$props.localEcho);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		beforeUpdate,
    		afterUpdate,
    		serial,
    		config,
    		localEcho,
    		div,
    		autoscroll,
    		rxData,
    		acc,
    		line,
    		document,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("config" in $$props) $$invalidate(3, config = $$props.config);
    		if ("localEcho" in $$props) $$invalidate(4, localEcho = $$props.localEcho);
    		if ("div" in $$props) $$invalidate(0, div = $$props.div);
    		if ("autoscroll" in $$props) autoscroll = $$props.autoscroll;
    		if ("rxData" in $$props) $$invalidate(1, rxData = $$props.rxData);
    		if ("acc" in $$props) acc = $$props.acc;
    		if ("line" in $$props) $$invalidate(2, line = $$props.line);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [div, rxData, line, config, localEcho, autoscroll, acc, div_1_binding];
    }

    class Terminal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { config: 3, localEcho: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Terminal",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get config() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set config(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get localEcho() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set localEcho(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/DropDown.svelte generated by Svelte v3.19.1 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/DropDown.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (16:2) {#each items as item}
    function create_each_block$1(ctx) {
    	let option;
    	let t0_value = /*item*/ ctx[3] + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*item*/ ctx[3];
    			option.value = option.__value;
    			add_location(option, file$1, 16, 4, 243);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 2 && t0_value !== (t0_value = /*item*/ ctx[3] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*items*/ 2 && option_value_value !== (option_value_value = /*item*/ ctx[3])) {
    				prop_dev(option, "__value", option_value_value);
    			}

    			option.value = option.__value;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(16:2) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let select;
    	let dispose;
    	let each_value = /*items*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (/*value*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[2].call(select));
    			add_location(select, file$1, 14, 0, 187);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*value*/ ctx[0]);
    			dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[2]);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items*/ 2) {
    				each_value = /*items*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*value*/ 1) {
    				select_option(select, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { items = [] } = $$props;
    	let { value } = $$props;

    	onMount(async function () {
    		console.log(items);
    	});

    	const writable_props = ["items", "value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<DropDown> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		value = select_value(this);
    		$$invalidate(0, value);
    		$$invalidate(1, items);
    	}

    	$$self.$set = $$props => {
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({ onMount, items, value, console });

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*items*/ 2) {
    			 console.log(items);
    		}
    	};

    	return [value, items, select_change_handler];
    }

    class DropDown extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { items: 1, value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DropDown",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[0] === undefined && !("value" in props)) {
    			console_1$1.warn("<DropDown> was created without expected prop 'value'");
    		}
    	}

    	get items() {
    		throw new Error("<DropDown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<DropDown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<DropDown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<DropDown>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ConfigureTerminal.svelte generated by Svelte v3.19.1 */

    const { console: console_1$2 } = globals;
    const file$2 = "src/ConfigureTerminal.svelte";

    function create_fragment$2(ctx) {
    	let form;
    	let button;
    	let t0;
    	let button_disabled_value;
    	let t1;
    	let updating_value;
    	let t2;
    	let updating_value_1;
    	let t3;
    	let updating_value_2;
    	let t4;
    	let updating_value_3;
    	let t5;
    	let updating_value_4;
    	let current;
    	let dispose;

    	function dropdown0_value_binding(value) {
    		/*dropdown0_value_binding*/ ctx[12].call(null, value);
    	}

    	let dropdown0_props = { items: /*paths*/ ctx[0] };

    	if (/*path*/ ctx[1] !== void 0) {
    		dropdown0_props.value = /*path*/ ctx[1];
    	}

    	const dropdown0 = new DropDown({ props: dropdown0_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown0, "value", dropdown0_value_binding));

    	function dropdown1_value_binding(value) {
    		/*dropdown1_value_binding*/ ctx[13].call(null, value);
    	}

    	let dropdown1_props = { items: /*baudRates*/ ctx[6] };

    	if (/*baudRate*/ ctx[2] !== void 0) {
    		dropdown1_props.value = /*baudRate*/ ctx[2];
    	}

    	const dropdown1 = new DropDown({ props: dropdown1_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown1, "value", dropdown1_value_binding));

    	function dropdown2_value_binding(value) {
    		/*dropdown2_value_binding*/ ctx[14].call(null, value);
    	}

    	let dropdown2_props = { items: /*dataBitsList*/ ctx[9] };

    	if (/*dataBits*/ ctx[5] !== void 0) {
    		dropdown2_props.value = /*dataBits*/ ctx[5];
    	}

    	const dropdown2 = new DropDown({ props: dropdown2_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown2, "value", dropdown2_value_binding));

    	function dropdown3_value_binding(value) {
    		/*dropdown3_value_binding*/ ctx[15].call(null, value);
    	}

    	let dropdown3_props = { items: /*parityList*/ ctx[8] };

    	if (/*parity*/ ctx[4] !== void 0) {
    		dropdown3_props.value = /*parity*/ ctx[4];
    	}

    	const dropdown3 = new DropDown({ props: dropdown3_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown3, "value", dropdown3_value_binding));

    	function dropdown4_value_binding(value) {
    		/*dropdown4_value_binding*/ ctx[16].call(null, value);
    	}

    	let dropdown4_props = { items: /*stopBitsList*/ ctx[7] };

    	if (/*stopBits*/ ctx[3] !== void 0) {
    		dropdown4_props.value = /*stopBits*/ ctx[3];
    	}

    	const dropdown4 = new DropDown({ props: dropdown4_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown4, "value", dropdown4_value_binding));

    	const block = {
    		c: function create() {
    			form = element("form");
    			button = element("button");
    			t0 = text("Connect");
    			t1 = space();
    			create_component(dropdown0.$$.fragment);
    			t2 = space();
    			create_component(dropdown1.$$.fragment);
    			t3 = space();
    			create_component(dropdown2.$$.fragment);
    			t4 = space();
    			create_component(dropdown3.$$.fragment);
    			t5 = space();
    			create_component(dropdown4.$$.fragment);
    			button.disabled = button_disabled_value = /*path*/ ctx[1] === emptyPath;
    			attr_dev(button, "type", "submit");
    			add_location(button, file$2, 44, 1, 889);
    			add_location(form, file$2, 43, 0, 841);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, button);
    			append_dev(button, t0);
    			append_dev(form, t1);
    			mount_component(dropdown0, form, null);
    			append_dev(form, t2);
    			mount_component(dropdown1, form, null);
    			append_dev(form, t3);
    			mount_component(dropdown2, form, null);
    			append_dev(form, t4);
    			mount_component(dropdown3, form, null);
    			append_dev(form, t5);
    			mount_component(dropdown4, form, null);
    			current = true;
    			dispose = listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[10]), false, true, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*path*/ 2 && button_disabled_value !== (button_disabled_value = /*path*/ ctx[1] === emptyPath)) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			const dropdown0_changes = {};
    			if (dirty & /*paths*/ 1) dropdown0_changes.items = /*paths*/ ctx[0];

    			if (!updating_value && dirty & /*path*/ 2) {
    				updating_value = true;
    				dropdown0_changes.value = /*path*/ ctx[1];
    				add_flush_callback(() => updating_value = false);
    			}

    			dropdown0.$set(dropdown0_changes);
    			const dropdown1_changes = {};

    			if (!updating_value_1 && dirty & /*baudRate*/ 4) {
    				updating_value_1 = true;
    				dropdown1_changes.value = /*baudRate*/ ctx[2];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			dropdown1.$set(dropdown1_changes);
    			const dropdown2_changes = {};

    			if (!updating_value_2 && dirty & /*dataBits*/ 32) {
    				updating_value_2 = true;
    				dropdown2_changes.value = /*dataBits*/ ctx[5];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			dropdown2.$set(dropdown2_changes);
    			const dropdown3_changes = {};

    			if (!updating_value_3 && dirty & /*parity*/ 16) {
    				updating_value_3 = true;
    				dropdown3_changes.value = /*parity*/ ctx[4];
    				add_flush_callback(() => updating_value_3 = false);
    			}

    			dropdown3.$set(dropdown3_changes);
    			const dropdown4_changes = {};

    			if (!updating_value_4 && dirty & /*stopBits*/ 8) {
    				updating_value_4 = true;
    				dropdown4_changes.value = /*stopBits*/ ctx[3];
    				add_flush_callback(() => updating_value_4 = false);
    			}

    			dropdown4.$set(dropdown4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dropdown0.$$.fragment, local);
    			transition_in(dropdown1.$$.fragment, local);
    			transition_in(dropdown2.$$.fragment, local);
    			transition_in(dropdown3.$$.fragment, local);
    			transition_in(dropdown4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dropdown0.$$.fragment, local);
    			transition_out(dropdown1.$$.fragment, local);
    			transition_out(dropdown2.$$.fragment, local);
    			transition_out(dropdown3.$$.fragment, local);
    			transition_out(dropdown4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_component(dropdown0);
    			destroy_component(dropdown1);
    			destroy_component(dropdown2);
    			destroy_component(dropdown3);
    			destroy_component(dropdown4);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const emptyPath = "--";

    function instance$2($$self, $$props, $$invalidate) {
    	let { config = {} } = $$props;
    	let paths = [];
    	let baudRates = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 76800, 115200, 230400];
    	let stopBitsList = [1, 2];
    	let parityList = ["none", "even", "odd"];
    	let dataBitsList = [7, 8];
    	let path = emptyPath;
    	let baudRate = 115200;
    	let stopBits = 1;
    	let parity = "none";
    	let dataBits = 8;

    	function handleSubmit() {
    		$$invalidate(11, config = {
    			path,
    			baudRate,
    			dataBits,
    			parity,
    			stopBits
    		});
    	}

    	onMount(async function () {
    		const ports = await serial.listPorts();
    		$$invalidate(0, paths = ports.map(item => item.path));
    		paths.unshift(emptyPath);
    		console.log(paths);
    	});

    	const writable_props = ["config"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<ConfigureTerminal> was created with unknown prop '${key}'`);
    	});

    	function dropdown0_value_binding(value) {
    		path = value;
    		$$invalidate(1, path);
    	}

    	function dropdown1_value_binding(value) {
    		baudRate = value;
    		$$invalidate(2, baudRate);
    	}

    	function dropdown2_value_binding(value) {
    		dataBits = value;
    		$$invalidate(5, dataBits);
    	}

    	function dropdown3_value_binding(value) {
    		parity = value;
    		$$invalidate(4, parity);
    	}

    	function dropdown4_value_binding(value) {
    		stopBits = value;
    		$$invalidate(3, stopBits);
    	}

    	$$self.$set = $$props => {
    		if ("config" in $$props) $$invalidate(11, config = $$props.config);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		serial,
    		DropDown,
    		config,
    		emptyPath,
    		paths,
    		baudRates,
    		stopBitsList,
    		parityList,
    		dataBitsList,
    		path,
    		baudRate,
    		stopBits,
    		parity,
    		dataBits,
    		handleSubmit,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("config" in $$props) $$invalidate(11, config = $$props.config);
    		if ("paths" in $$props) $$invalidate(0, paths = $$props.paths);
    		if ("baudRates" in $$props) $$invalidate(6, baudRates = $$props.baudRates);
    		if ("stopBitsList" in $$props) $$invalidate(7, stopBitsList = $$props.stopBitsList);
    		if ("parityList" in $$props) $$invalidate(8, parityList = $$props.parityList);
    		if ("dataBitsList" in $$props) $$invalidate(9, dataBitsList = $$props.dataBitsList);
    		if ("path" in $$props) $$invalidate(1, path = $$props.path);
    		if ("baudRate" in $$props) $$invalidate(2, baudRate = $$props.baudRate);
    		if ("stopBits" in $$props) $$invalidate(3, stopBits = $$props.stopBits);
    		if ("parity" in $$props) $$invalidate(4, parity = $$props.parity);
    		if ("dataBits" in $$props) $$invalidate(5, dataBits = $$props.dataBits);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		paths,
    		path,
    		baudRate,
    		stopBits,
    		parity,
    		dataBits,
    		baudRates,
    		stopBitsList,
    		parityList,
    		dataBitsList,
    		handleSubmit,
    		config,
    		dropdown0_value_binding,
    		dropdown1_value_binding,
    		dropdown2_value_binding,
    		dropdown3_value_binding,
    		dropdown4_value_binding
    	];
    }

    class ConfigureTerminal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { config: 11 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ConfigureTerminal",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get config() {
    		throw new Error("<ConfigureTerminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set config(value) {
    		throw new Error("<ConfigureTerminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/StatusLine.svelte generated by Svelte v3.19.1 */

    function create_fragment$3(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { config = {} } = $$props;

    	document.title = `${config.path} : ${config.baudRate} / ${config.dataBits}-${config.parity === "none"
	? "N"
	: config.parity === "odd" ? "O" : "E"}-${config.stopBits}`;

    	const writable_props = ["config"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<StatusLine> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("config" in $$props) $$invalidate(0, config = $$props.config);
    	};

    	$$self.$capture_state = () => ({ config, document });

    	$$self.$inject_state = $$props => {
    		if ("config" in $$props) $$invalidate(0, config = $$props.config);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [config];
    }

    class StatusLine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { config: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "StatusLine",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get config() {
    		throw new Error("<StatusLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set config(value) {
    		throw new Error("<StatusLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.19.1 */

    // (14:0) {:else}
    function create_else_block(ctx) {
    	let t;
    	let current;

    	const statusline = new StatusLine({
    			props: { config: /*config*/ ctx[0] },
    			$$inline: true
    		});

    	const terminal = new Terminal({
    			props: { config: /*config*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(statusline.$$.fragment);
    			t = space();
    			create_component(terminal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(statusline, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(terminal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const statusline_changes = {};
    			if (dirty & /*config*/ 1) statusline_changes.config = /*config*/ ctx[0];
    			statusline.$set(statusline_changes);
    			const terminal_changes = {};
    			if (dirty & /*config*/ 1) terminal_changes.config = /*config*/ ctx[0];
    			terminal.$set(terminal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(statusline.$$.fragment, local);
    			transition_in(terminal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(statusline.$$.fragment, local);
    			transition_out(terminal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(statusline, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(terminal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(14:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (12:0) {#if !config}
    function create_if_block(ctx) {
    	let updating_config;
    	let current;

    	function configureterminal_config_binding(value) {
    		/*configureterminal_config_binding*/ ctx[1].call(null, value);
    	}

    	let configureterminal_props = {};

    	if (/*config*/ ctx[0] !== void 0) {
    		configureterminal_props.config = /*config*/ ctx[0];
    	}

    	const configureterminal = new ConfigureTerminal({
    			props: configureterminal_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(configureterminal, "config", configureterminal_config_binding));

    	const block = {
    		c: function create() {
    			create_component(configureterminal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(configureterminal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const configureterminal_changes = {};

    			if (!updating_config && dirty & /*config*/ 1) {
    				updating_config = true;
    				configureterminal_changes.config = /*config*/ ctx[0];
    				add_flush_callback(() => updating_config = false);
    			}

    			configureterminal.$set(configureterminal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(configureterminal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(configureterminal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(configureterminal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(12:0) {#if !config}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*config*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let config = null;
    	document.title = "Serial Terminal";

    	function configureterminal_config_binding(value) {
    		config = value;
    		$$invalidate(0, config);
    	}

    	$$self.$capture_state = () => ({
    		Terminal,
    		ConfigureTerminal,
    		StatusLine,
    		config,
    		document
    	});

    	$$self.$inject_state = $$props => {
    		if ("config" in $$props) $$invalidate(0, config = $$props.config);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [config, configureterminal_config_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
