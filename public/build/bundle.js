
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
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
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
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

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
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

    var serial = { listPorts, openPort };

    /* src/Terminal.svelte generated by Svelte v3.19.1 */

    const { console: console_1 } = globals;
    const file = "src/Terminal.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (122:2) {#each rxData as line}
    function create_each_block(ctx) {
    	let pre;
    	let t_value = /*line*/ ctx[19] + "";
    	let t;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			t = text(t_value);
    			attr_dev(pre, "class", "svelte-1otaxul");
    			add_location(pre, file, 122, 4, 2710);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rxData*/ 2 && t_value !== (t_value = /*line*/ ctx[19] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(122:2) {#each rxData as line}",
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

    			attr_dev(div_1, "class", "svelte-1otaxul");
    			add_location(div_1, file, 120, 0, 2659);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div_1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div_1, null);
    			}

    			/*div_1_binding*/ ctx[18](div_1);
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
    			/*div_1_binding*/ ctx[18](null);
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
    	const { remote } = require("electron");
    	const { Menu, MenuItem } = remote;
    	let { path } = $$props;
    	let { baudRate } = $$props;
    	let { dataBits } = $$props;
    	let { parity } = $$props;
    	let { stopBits } = $$props;
    	let { localEcho } = $$props;
    	let { isConnected = false } = $$props;
    	let div;
    	let autoscroll;
    	let acc = [""];
    	let rxData = acc;
    	let port;

    	const printToLine = c => {
    		acc[acc.length - 1] += c;

    		if (c === 10) {
    			acc.push(new String());
    		}
    	};

    	const keyPressed = e => {
    		console.log(e);

    		// Auto scroll to the bottom on keypress
    		div.scrollTo(0, div.scrollHeight);

    		let key = e.key;

    		if (e.keyCode === 13) {
    			key = "\n";
    		}

    		port.write(key);

    		if (localEcho) {
    			printToLine(key);
    			$$invalidate(1, rxData = acc);
    		}
    	};

    	onMount(async function () {
    		port = serial.openPort(path, baudRate, dataBits, parity, stopBits);

    		port.on("error", err => {
    			console.error("Error", err);
    			$$invalidate(3, isConnected = false);
    		});

    		port.on("close", err => {
    			console.log("Closed", err);
    			$$invalidate(3, isConnected = false);
    		});

    		port.on("data", chunk => {
    			for (const c of chunk) {
    				printToLine(String.fromCharCode(c));
    			}

    			$$invalidate(1, rxData = acc);
    		});

    		$$invalidate(3, isConnected = true);
    		document.onkeypress = keyPressed;
    	});

    	onDestroy(() => {
    		port.close();
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

    	const menu = new Menu();

    	menu.append(new MenuItem({
    			label: "Local Echo",
    			type: "checkbox",
    			checked: localEcho,
    			click() {
    				$$invalidate(2, localEcho = !localEcho);
    			}
    		}));

    	menu.append(new MenuItem({ type: "separator" }));

    	menu.append(new MenuItem({
    			label: "Disconnect",
    			click() {
    				console.log("Disconnecting");
    				$$invalidate(3, isConnected = false);
    			}
    		}));

    	menu.append(new MenuItem({ type: "separator" }));
    	menu.append(new MenuItem({ role: "selectAll" }));
    	menu.append(new MenuItem({ role: "copy" }));

    	// menu.append(new MenuItem({ role: 'paste' })) Paste isn't woring for some reason
    	window.addEventListener(
    		"contextmenu",
    		e => {
    			e.preventDefault();
    			menu.popup({ window: remote.getCurrentWindow() });
    		},
    		false
    	);

    	const writable_props = [
    		"path",
    		"baudRate",
    		"dataBits",
    		"parity",
    		"stopBits",
    		"localEcho",
    		"isConnected"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Terminal> was created with unknown prop '${key}'`);
    	});

    	function div_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, div = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("path" in $$props) $$invalidate(4, path = $$props.path);
    		if ("baudRate" in $$props) $$invalidate(5, baudRate = $$props.baudRate);
    		if ("dataBits" in $$props) $$invalidate(6, dataBits = $$props.dataBits);
    		if ("parity" in $$props) $$invalidate(7, parity = $$props.parity);
    		if ("stopBits" in $$props) $$invalidate(8, stopBits = $$props.stopBits);
    		if ("localEcho" in $$props) $$invalidate(2, localEcho = $$props.localEcho);
    		if ("isConnected" in $$props) $$invalidate(3, isConnected = $$props.isConnected);
    	};

    	$$self.$capture_state = () => ({
    		remote,
    		Menu,
    		MenuItem,
    		onMount,
    		onDestroy,
    		beforeUpdate,
    		afterUpdate,
    		serial,
    		path,
    		baudRate,
    		dataBits,
    		parity,
    		stopBits,
    		localEcho,
    		isConnected,
    		div,
    		autoscroll,
    		acc,
    		rxData,
    		port,
    		printToLine,
    		keyPressed,
    		menu,
    		require,
    		String,
    		console,
    		document,
    		window
    	});

    	$$self.$inject_state = $$props => {
    		if ("path" in $$props) $$invalidate(4, path = $$props.path);
    		if ("baudRate" in $$props) $$invalidate(5, baudRate = $$props.baudRate);
    		if ("dataBits" in $$props) $$invalidate(6, dataBits = $$props.dataBits);
    		if ("parity" in $$props) $$invalidate(7, parity = $$props.parity);
    		if ("stopBits" in $$props) $$invalidate(8, stopBits = $$props.stopBits);
    		if ("localEcho" in $$props) $$invalidate(2, localEcho = $$props.localEcho);
    		if ("isConnected" in $$props) $$invalidate(3, isConnected = $$props.isConnected);
    		if ("div" in $$props) $$invalidate(0, div = $$props.div);
    		if ("autoscroll" in $$props) autoscroll = $$props.autoscroll;
    		if ("acc" in $$props) acc = $$props.acc;
    		if ("rxData" in $$props) $$invalidate(1, rxData = $$props.rxData);
    		if ("port" in $$props) port = $$props.port;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		div,
    		rxData,
    		localEcho,
    		isConnected,
    		path,
    		baudRate,
    		dataBits,
    		parity,
    		stopBits,
    		autoscroll,
    		acc,
    		port,
    		remote,
    		Menu,
    		MenuItem,
    		printToLine,
    		keyPressed,
    		menu,
    		div_1_binding
    	];
    }

    class Terminal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			path: 4,
    			baudRate: 5,
    			dataBits: 6,
    			parity: 7,
    			stopBits: 8,
    			localEcho: 2,
    			isConnected: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Terminal",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*path*/ ctx[4] === undefined && !("path" in props)) {
    			console_1.warn("<Terminal> was created without expected prop 'path'");
    		}

    		if (/*baudRate*/ ctx[5] === undefined && !("baudRate" in props)) {
    			console_1.warn("<Terminal> was created without expected prop 'baudRate'");
    		}

    		if (/*dataBits*/ ctx[6] === undefined && !("dataBits" in props)) {
    			console_1.warn("<Terminal> was created without expected prop 'dataBits'");
    		}

    		if (/*parity*/ ctx[7] === undefined && !("parity" in props)) {
    			console_1.warn("<Terminal> was created without expected prop 'parity'");
    		}

    		if (/*stopBits*/ ctx[8] === undefined && !("stopBits" in props)) {
    			console_1.warn("<Terminal> was created without expected prop 'stopBits'");
    		}

    		if (/*localEcho*/ ctx[2] === undefined && !("localEcho" in props)) {
    			console_1.warn("<Terminal> was created without expected prop 'localEcho'");
    		}
    	}

    	get path() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get baudRate() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set baudRate(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dataBits() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dataBits(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parity() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parity(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get stopBits() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stopBits(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get localEcho() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set localEcho(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isConnected() {
    		throw new Error("<Terminal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isConnected(value) {
    		throw new Error("<Terminal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/DropDown.svelte generated by Svelte v3.19.1 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/DropDown.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (30:4) {#each items as item}
    function create_each_block$1(ctx) {
    	let option;
    	let t0_value = /*item*/ ctx[4] + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*item*/ ctx[4];
    			option.value = option.__value;
    			add_location(option, file$1, 30, 6, 408);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 2 && t0_value !== (t0_value = /*item*/ ctx[4] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*items*/ 2 && option_value_value !== (option_value_value = /*item*/ ctx[4])) {
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
    		source: "(30:4) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let label_1;
    	let t0;
    	let t1;
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
    			div = element("div");
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[2]);
    			t1 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(label_1, "for", "list");
    			attr_dev(label_1, "class", "svelte-53mqk9");
    			add_location(label_1, file$1, 27, 2, 306);
    			attr_dev(select, "id", "list");
    			attr_dev(select, "class", "svelte-53mqk9");
    			if (/*value*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[3].call(select));
    			add_location(select, file$1, 28, 2, 340);
    			attr_dev(div, "class", "svelte-53mqk9");
    			add_location(div, file$1, 26, 0, 298);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label_1);
    			append_dev(label_1, t0);
    			append_dev(div, t1);
    			append_dev(div, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*value*/ ctx[0]);
    			dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[3]);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*label*/ 4) set_data_dev(t0, /*label*/ ctx[2]);

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
    			if (detaching) detach_dev(div);
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
    	let { label = "Choose:" } = $$props;
    	let { value } = $$props;

    	onMount(async function () {
    		console.log(items);
    	});

    	const writable_props = ["items", "label", "value"];

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
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({ onMount, items, label, value, console });

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(1, items = $$props.items);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, items, label, select_change_handler];
    }

    class DropDown extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { items: 1, label: 2, value: 0 });

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

    	get label() {
    		throw new Error("<DropDown>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
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
    	let updating_value;
    	let t0;
    	let updating_value_1;
    	let t1;
    	let updating_value_2;
    	let t2;
    	let updating_value_3;
    	let t3;
    	let updating_value_4;
    	let t4;
    	let updating_value_5;
    	let t5;
    	let button;
    	let t6;
    	let button_disabled_value;
    	let current;
    	let dispose;

    	function dropdown0_value_binding(value) {
    		/*dropdown0_value_binding*/ ctx[14].call(null, value);
    	}

    	let dropdown0_props = { label: "Path", items: /*paths*/ ctx[0] };

    	if (/*path*/ ctx[1] !== void 0) {
    		dropdown0_props.value = /*path*/ ctx[1];
    	}

    	const dropdown0 = new DropDown({ props: dropdown0_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown0, "value", dropdown0_value_binding));

    	function dropdown1_value_binding(value) {
    		/*dropdown1_value_binding*/ ctx[15].call(null, value);
    	}

    	let dropdown1_props = {
    		label: "Baud",
    		items: /*baudRates*/ ctx[7]
    	};

    	if (/*baudRate*/ ctx[2] !== void 0) {
    		dropdown1_props.value = /*baudRate*/ ctx[2];
    	}

    	const dropdown1 = new DropDown({ props: dropdown1_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown1, "value", dropdown1_value_binding));

    	function dropdown2_value_binding(value) {
    		/*dropdown2_value_binding*/ ctx[16].call(null, value);
    	}

    	let dropdown2_props = {
    		label: "Data Bits",
    		items: /*dataBitsList*/ ctx[10]
    	};

    	if (/*dataBits*/ ctx[5] !== void 0) {
    		dropdown2_props.value = /*dataBits*/ ctx[5];
    	}

    	const dropdown2 = new DropDown({ props: dropdown2_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown2, "value", dropdown2_value_binding));

    	function dropdown3_value_binding(value) {
    		/*dropdown3_value_binding*/ ctx[17].call(null, value);
    	}

    	let dropdown3_props = {
    		label: "Parity",
    		items: /*parityList*/ ctx[9]
    	};

    	if (/*parity*/ ctx[4] !== void 0) {
    		dropdown3_props.value = /*parity*/ ctx[4];
    	}

    	const dropdown3 = new DropDown({ props: dropdown3_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown3, "value", dropdown3_value_binding));

    	function dropdown4_value_binding(value) {
    		/*dropdown4_value_binding*/ ctx[18].call(null, value);
    	}

    	let dropdown4_props = {
    		label: "Stop Bits",
    		items: /*stopBitsList*/ ctx[8]
    	};

    	if (/*stopBits*/ ctx[3] !== void 0) {
    		dropdown4_props.value = /*stopBits*/ ctx[3];
    	}

    	const dropdown4 = new DropDown({ props: dropdown4_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown4, "value", dropdown4_value_binding));

    	function dropdown5_value_binding(value) {
    		/*dropdown5_value_binding*/ ctx[19].call(null, value);
    	}

    	let dropdown5_props = {
    		label: "Local Echo",
    		items: /*localEchoList*/ ctx[11]
    	};

    	if (/*localEcho*/ ctx[6] !== void 0) {
    		dropdown5_props.value = /*localEcho*/ ctx[6];
    	}

    	const dropdown5 = new DropDown({ props: dropdown5_props, $$inline: true });
    	binding_callbacks.push(() => bind(dropdown5, "value", dropdown5_value_binding));

    	const block = {
    		c: function create() {
    			form = element("form");
    			create_component(dropdown0.$$.fragment);
    			t0 = space();
    			create_component(dropdown1.$$.fragment);
    			t1 = space();
    			create_component(dropdown2.$$.fragment);
    			t2 = space();
    			create_component(dropdown3.$$.fragment);
    			t3 = space();
    			create_component(dropdown4.$$.fragment);
    			t4 = space();
    			create_component(dropdown5.$$.fragment);
    			t5 = space();
    			button = element("button");
    			t6 = text("Connect");
    			button.disabled = button_disabled_value = /*path*/ ctx[1] === emptyPath;
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-1vrzg62");
    			add_location(button, file$2, 62, 1, 1520);
    			attr_dev(form, "class", "svelte-1vrzg62");
    			add_location(form, file$2, 55, 0, 1050);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			mount_component(dropdown0, form, null);
    			append_dev(form, t0);
    			mount_component(dropdown1, form, null);
    			append_dev(form, t1);
    			mount_component(dropdown2, form, null);
    			append_dev(form, t2);
    			mount_component(dropdown3, form, null);
    			append_dev(form, t3);
    			mount_component(dropdown4, form, null);
    			append_dev(form, t4);
    			mount_component(dropdown5, form, null);
    			append_dev(form, t5);
    			append_dev(form, button);
    			append_dev(button, t6);
    			current = true;
    			dispose = listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[12]), false, true, false);
    		},
    		p: function update(ctx, [dirty]) {
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
    			const dropdown5_changes = {};

    			if (!updating_value_5 && dirty & /*localEcho*/ 64) {
    				updating_value_5 = true;
    				dropdown5_changes.value = /*localEcho*/ ctx[6];
    				add_flush_callback(() => updating_value_5 = false);
    			}

    			dropdown5.$set(dropdown5_changes);

    			if (!current || dirty & /*path*/ 2 && button_disabled_value !== (button_disabled_value = /*path*/ ctx[1] === emptyPath)) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dropdown0.$$.fragment, local);
    			transition_in(dropdown1.$$.fragment, local);
    			transition_in(dropdown2.$$.fragment, local);
    			transition_in(dropdown3.$$.fragment, local);
    			transition_in(dropdown4.$$.fragment, local);
    			transition_in(dropdown5.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dropdown0.$$.fragment, local);
    			transition_out(dropdown1.$$.fragment, local);
    			transition_out(dropdown2.$$.fragment, local);
    			transition_out(dropdown3.$$.fragment, local);
    			transition_out(dropdown4.$$.fragment, local);
    			transition_out(dropdown5.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			destroy_component(dropdown0);
    			destroy_component(dropdown1);
    			destroy_component(dropdown2);
    			destroy_component(dropdown3);
    			destroy_component(dropdown4);
    			destroy_component(dropdown5);
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
    	let localEchoList = ["no", "yes"];
    	let path = emptyPath;
    	let baudRate = 115200;
    	let stopBits = 1;
    	let parity = "none";
    	let dataBits = 8;
    	let localEcho = "no";

    	function handleSubmit() {
    		$$invalidate(13, config = {
    			path,
    			baudRate,
    			dataBits,
    			parity,
    			stopBits,
    			localEcho: localEcho === "yes" ? true : false
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

    	function dropdown5_value_binding(value) {
    		localEcho = value;
    		$$invalidate(6, localEcho);
    	}

    	$$self.$set = $$props => {
    		if ("config" in $$props) $$invalidate(13, config = $$props.config);
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
    		localEchoList,
    		path,
    		baudRate,
    		stopBits,
    		parity,
    		dataBits,
    		localEcho,
    		handleSubmit,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("config" in $$props) $$invalidate(13, config = $$props.config);
    		if ("paths" in $$props) $$invalidate(0, paths = $$props.paths);
    		if ("baudRates" in $$props) $$invalidate(7, baudRates = $$props.baudRates);
    		if ("stopBitsList" in $$props) $$invalidate(8, stopBitsList = $$props.stopBitsList);
    		if ("parityList" in $$props) $$invalidate(9, parityList = $$props.parityList);
    		if ("dataBitsList" in $$props) $$invalidate(10, dataBitsList = $$props.dataBitsList);
    		if ("localEchoList" in $$props) $$invalidate(11, localEchoList = $$props.localEchoList);
    		if ("path" in $$props) $$invalidate(1, path = $$props.path);
    		if ("baudRate" in $$props) $$invalidate(2, baudRate = $$props.baudRate);
    		if ("stopBits" in $$props) $$invalidate(3, stopBits = $$props.stopBits);
    		if ("parity" in $$props) $$invalidate(4, parity = $$props.parity);
    		if ("dataBits" in $$props) $$invalidate(5, dataBits = $$props.dataBits);
    		if ("localEcho" in $$props) $$invalidate(6, localEcho = $$props.localEcho);
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
    		localEcho,
    		baudRates,
    		stopBitsList,
    		parityList,
    		dataBitsList,
    		localEchoList,
    		handleSubmit,
    		config,
    		dropdown0_value_binding,
    		dropdown1_value_binding,
    		dropdown2_value_binding,
    		dropdown3_value_binding,
    		dropdown4_value_binding,
    		dropdown5_value_binding
    	];
    }

    class ConfigureTerminal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { config: 13 });

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
    	let { path } = $$props;
    	let { baudRate } = $$props;
    	let { dataBits } = $$props;
    	let { parity } = $$props;
    	let { stopBits } = $$props;
    	document.title = `${path} : ${baudRate} / ${dataBits}-${parity === "none" ? "N" : parity === "odd" ? "O" : "E"}-${stopBits}`;
    	const writable_props = ["path", "baudRate", "dataBits", "parity", "stopBits"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<StatusLine> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("path" in $$props) $$invalidate(0, path = $$props.path);
    		if ("baudRate" in $$props) $$invalidate(1, baudRate = $$props.baudRate);
    		if ("dataBits" in $$props) $$invalidate(2, dataBits = $$props.dataBits);
    		if ("parity" in $$props) $$invalidate(3, parity = $$props.parity);
    		if ("stopBits" in $$props) $$invalidate(4, stopBits = $$props.stopBits);
    	};

    	$$self.$capture_state = () => ({
    		path,
    		baudRate,
    		dataBits,
    		parity,
    		stopBits,
    		document
    	});

    	$$self.$inject_state = $$props => {
    		if ("path" in $$props) $$invalidate(0, path = $$props.path);
    		if ("baudRate" in $$props) $$invalidate(1, baudRate = $$props.baudRate);
    		if ("dataBits" in $$props) $$invalidate(2, dataBits = $$props.dataBits);
    		if ("parity" in $$props) $$invalidate(3, parity = $$props.parity);
    		if ("stopBits" in $$props) $$invalidate(4, stopBits = $$props.stopBits);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [path, baudRate, dataBits, parity, stopBits];
    }

    class StatusLine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			path: 0,
    			baudRate: 1,
    			dataBits: 2,
    			parity: 3,
    			stopBits: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "StatusLine",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*path*/ ctx[0] === undefined && !("path" in props)) {
    			console.warn("<StatusLine> was created without expected prop 'path'");
    		}

    		if (/*baudRate*/ ctx[1] === undefined && !("baudRate" in props)) {
    			console.warn("<StatusLine> was created without expected prop 'baudRate'");
    		}

    		if (/*dataBits*/ ctx[2] === undefined && !("dataBits" in props)) {
    			console.warn("<StatusLine> was created without expected prop 'dataBits'");
    		}

    		if (/*parity*/ ctx[3] === undefined && !("parity" in props)) {
    			console.warn("<StatusLine> was created without expected prop 'parity'");
    		}

    		if (/*stopBits*/ ctx[4] === undefined && !("stopBits" in props)) {
    			console.warn("<StatusLine> was created without expected prop 'stopBits'");
    		}
    	}

    	get path() {
    		throw new Error("<StatusLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<StatusLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get baudRate() {
    		throw new Error("<StatusLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set baudRate(value) {
    		throw new Error("<StatusLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dataBits() {
    		throw new Error("<StatusLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dataBits(value) {
    		throw new Error("<StatusLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parity() {
    		throw new Error("<StatusLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parity(value) {
    		throw new Error("<StatusLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get stopBits() {
    		throw new Error("<StatusLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stopBits(value) {
    		throw new Error("<StatusLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.19.1 */
    const file$3 = "src/App.svelte";

    // (21:1) {:else}
    function create_else_block(ctx) {
    	let div;
    	let t;
    	let current;

    	const statusline = new StatusLine({
    			props: {
    				path: /*config*/ ctx[0].path,
    				baudRate: /*config*/ ctx[0].baudRate,
    				dataBits: /*config*/ ctx[0].dataBits,
    				parity: /*config*/ ctx[0].parity,
    				stopBits: /*config*/ ctx[0].stopBits
    			},
    			$$inline: true
    		});

    	const terminal = new Terminal({
    			props: {
    				path: /*config*/ ctx[0].path,
    				baudRate: /*config*/ ctx[0].baudRate,
    				dataBits: /*config*/ ctx[0].dataBits,
    				parity: /*config*/ ctx[0].parity,
    				stopBits: /*config*/ ctx[0].stopBits,
    				localEcho: /*config*/ ctx[0].localEcho
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(statusline.$$.fragment);
    			t = space();
    			create_component(terminal.$$.fragment);
    			add_location(div, file$3, 21, 2, 443);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(statusline, div, null);
    			append_dev(div, t);
    			mount_component(terminal, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const statusline_changes = {};
    			if (dirty & /*config*/ 1) statusline_changes.path = /*config*/ ctx[0].path;
    			if (dirty & /*config*/ 1) statusline_changes.baudRate = /*config*/ ctx[0].baudRate;
    			if (dirty & /*config*/ 1) statusline_changes.dataBits = /*config*/ ctx[0].dataBits;
    			if (dirty & /*config*/ 1) statusline_changes.parity = /*config*/ ctx[0].parity;
    			if (dirty & /*config*/ 1) statusline_changes.stopBits = /*config*/ ctx[0].stopBits;
    			statusline.$set(statusline_changes);
    			const terminal_changes = {};
    			if (dirty & /*config*/ 1) terminal_changes.path = /*config*/ ctx[0].path;
    			if (dirty & /*config*/ 1) terminal_changes.baudRate = /*config*/ ctx[0].baudRate;
    			if (dirty & /*config*/ 1) terminal_changes.dataBits = /*config*/ ctx[0].dataBits;
    			if (dirty & /*config*/ 1) terminal_changes.parity = /*config*/ ctx[0].parity;
    			if (dirty & /*config*/ 1) terminal_changes.stopBits = /*config*/ ctx[0].stopBits;
    			if (dirty & /*config*/ 1) terminal_changes.localEcho = /*config*/ ctx[0].localEcho;
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
    			if (detaching) detach_dev(div);
    			destroy_component(statusline);
    			destroy_component(terminal);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(21:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (14:1) {#if !config}
    function create_if_block(ctx) {
    	let div1;
    	let updating_config;
    	let t0;
    	let div0;
    	let h1;
    	let div1_transition;
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
    			div1 = element("div");
    			create_component(configureterminal.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Serial Terminal";
    			attr_dev(h1, "class", "svelte-39l9iw");
    			add_location(h1, file$3, 17, 4, 388);
    			attr_dev(div0, "id", "welcome");
    			attr_dev(div0, "class", "svelte-39l9iw");
    			add_location(div0, file$3, 16, 3, 365);
    			add_location(div1, file$3, 14, 2, 295);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			mount_component(configureterminal, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
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

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {}, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(configureterminal.$$.fragment, local);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {}, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(configureterminal);
    			if (detaching && div1_transition) div1_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(14:1) {#if !config}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let main;
    	let current_block_type_index;
    	let if_block;
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
    			main = element("main");
    			if_block.c();
    			attr_dev(main, "class", "svelte-39l9iw");
    			add_location(main, file$3, 12, 0, 271);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if_blocks[current_block_type_index].m(main, null);
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
    				if_block.m(main, null);
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
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
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
    		fade,
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
