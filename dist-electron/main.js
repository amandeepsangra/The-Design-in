import { BrowserWindow as e, app as t, ipcMain as n } from "electron";
import r from "node:path";
import i from "node:fs";
import { fileURLToPath as a } from "node:url";
//#region electron/main.ts
var o = r.dirname(a(import.meta.url));
process.env.APP_ROOT = r.join(o, "..");
var s = process.env.VITE_DEV_SERVER_URL, c = r.join(process.env.APP_ROOT, "dist-electron"), l = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = s ? r.join(process.env.APP_ROOT, "public") : l;
var u, d = !1, f = null, p = !1;
function m(e) {
	return e.find((e) => /\.tea$/i.test(e) || /\.te$/i.test(e)) || null;
}
function h(e) {
	u && u.webContents && !u.webContents.isLoadingMainFrame() ? g(e) : f = e;
}
function g(e) {
	i.readFile(e, "utf-8", (t, n) => {
		if (t) {
			console.error("Failed to read .tea file:", t);
			return;
		}
		u?.webContents.send("file:open-path", {
			name: r.basename(e),
			content: n
		});
	});
}
t.on("open-file", (e, t) => {
	e.preventDefault(), h(t);
}), t.requestSingleInstanceLock() ? t.on("second-instance", (e, t) => {
	u && (u.isMinimized() && u.restore(), u.focus());
	let n = m(t);
	n && h(n);
}) : t.quit();
function _() {
	u = new e({
		icon: r.join(process.env.VITE_PUBLIC, "logo.png"),
		webPreferences: { preload: r.join(o, "preload.mjs") },
		width: 1400,
		height: 900,
		minWidth: 900,
		minHeight: 600,
		frame: !1,
		titleBarStyle: "hidden",
		autoHideMenuBar: !0,
		title: "Tea Design In",
		backgroundColor: "#1a1a1a"
	}), n.on("window:minimize", () => u?.minimize()), n.on("window:maximize", () => {
		u?.isMaximized() ? u.unmaximize() : u?.maximize();
	}), n.on("window:close", () => u?.close()), n.handle("window:isMaximized", () => u?.isMaximized()), u.on("close", (e) => {
		d || (e.preventDefault(), u?.webContents.send("app:before-close"));
	}), n.on("app:confirm-close", () => {
		d = !0, u?.close();
	}), u.webContents.on("did-finish-load", () => {
		u?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
		let e = f;
		f = null, !e && !p && (e = m(process.argv)), p = !0, e && g(e);
	}), s ? u.loadURL(s) : u.loadFile(r.join(l, "index.html"));
}
t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), u = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && _();
}), t.whenReady().then(_);
//#endregion
export { c as MAIN_DIST, l as RENDERER_DIST, s as VITE_DEV_SERVER_URL };
