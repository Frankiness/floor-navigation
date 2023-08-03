export type EventType = string;

export interface EventCallBack {
	(parameters: any): any;
}

export class EventEmitter {
	private listeners: Map<EventType, EventCallBack[]>;

	constructor() {
		this.listeners = new Map<EventType, EventCallBack[]>();
	}

	addEventListener(type: EventType, callback: EventCallBack) {
		const origin_callback = this.listeners.get(type);
		if (origin_callback === undefined) {
			this.listeners.set(type, [callback]);
		} else {
			origin_callback.push(callback);
		}
	}

	removeEventListener(type: EventType, callback: EventCallBack) {
		const origin_callback = this.listeners.get(type);
		if (origin_callback !== undefined) {
			const callback_index = origin_callback.findIndex((value) => value === callback);
			if (callback_index !== -1) {
				origin_callback.splice(callback_index, 1);
			}
		}
	}

	dispatchEvent(type: EventType, parameters?: any) {
		const origin_callback = this.listeners.get(type);
		if (origin_callback !== undefined) {
			origin_callback.forEach((callback) => callback(parameters));
		}
	}
}
