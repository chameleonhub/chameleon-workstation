import { IpcMainInvokeEvent } from 'electron';

export interface UserData {
    username: string;
    password: string;
}

export interface BahisIpcMainInvokeEvent extends IpcMainInvokeEvent {
    type: string;
}

interface xForm {
    formID: string;
    name: string;
    descriptionText: string;
    downloadUrl: string;
}

export interface Form {
    uid: string;
    name: string;
    description: string;
    xml_url: string;
}

export interface FormListObj {
    xforms: { xform: xForm[] };
}

export interface CloudFormData {
    uuid: string;
    form_id: string;
    xml: string;
    created_at?: string;
}

export interface ToastMessageType {
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
    action?: boolean;
    duration?: number;
    options?: object;
}
