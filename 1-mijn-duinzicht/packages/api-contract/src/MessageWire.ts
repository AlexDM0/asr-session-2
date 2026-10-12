export interface MessageSummaryWire {
  readonly id:     string;
  readonly title:  string;
  readonly sentOn: string;
  readonly isRead: boolean;
}

export interface MessageDetailWire extends MessageSummaryWire {
  readonly body: string;
}

export interface MessageListWire {
  readonly messages: readonly MessageSummaryWire[];
}
