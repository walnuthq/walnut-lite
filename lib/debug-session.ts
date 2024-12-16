import { readFile } from "node:fs/promises";
import { LoggingDebugSession } from "@vscode/debugadapter";
import type { DebugProtocol } from "@vscode/debugprotocol";

interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  /** An absolute path to the "program" to debug. */
  program: string;
  /** Automatically stop target after launch. If not specified, target does not stop. */
  stopOnEntry?: boolean;
  /** enable logging the Debug Adapter Protocol */
  trace?: boolean;
  /** run without debugging */
  noDebug?: boolean;
  /** if specified, results in a simulated compile error in launch. */
  compileError?: "default" | "show" | "hide";
}

export default class DebugSession extends LoggingDebugSession {
  private _sources: Map<string, string> = new Map();
  async sendRequest(command: string, args?: any) {
    return new Promise<DebugProtocol.Response>((resolve) => {
      super.sendRequest(command, args, 400, (response) => resolve(response));
    });
  }
  async sendInitializeRequest(args: DebugProtocol.InitializeRequestArguments) {
    const response = await this.sendRequest("initialize", args);
    return response as DebugProtocol.InitializeResponse;
  }
  async sendConfigurationDoneRequest(
    args?: DebugProtocol.ConfigurationDoneArguments,
  ) {
    const response = await this.sendRequest("configurationDone", args);
    return response as DebugProtocol.ConfigurationDoneResponse;
  }
  /* async sendSourceRequest(args: DebugProtocol.SourceArguments) {
    const response = await this.sendRequest("source", args);
    return response as DebugProtocol.SourceResponse;
  } */
  async sendLaunchRequest(args: ILaunchRequestArguments) {
    const response = await this.sendRequest("launch", args);
    return response as DebugProtocol.ConfigurationDoneResponse;
  }
  /* async sendThreadsRequest() {
    const response = await this.sendRequest("threads");
    return response as DebugProtocol.ThreadsResponse;
  } */
  async sendStackTraceRequest(args: DebugProtocol.StackTraceArguments) {
    const response = await this.sendRequest("stackTrace", args);
    return response as DebugProtocol.StackTraceResponse;
  }
  async sendStepInRequest(args: DebugProtocol.StepInArguments) {
    const response = await this.sendRequest("stepIn", args);
    return response as DebugProtocol.StepInResponse;
  }
  async sendScopesRequest(args: DebugProtocol.ScopesArguments) {
    const response = await this.sendRequest("scopes", args);
    return response as DebugProtocol.ScopesResponse;
  }
  /* async sendStepInTargetsRequest(args: DebugProtocol.StepInTargetsArguments) {
    const response = await this.sendRequest("stepInTargets", args);
    return response as DebugProtocol.StepInTargetsResponse;
  } */
  async sendVariablesRequest(args: DebugProtocol.VariablesArguments) {
    const response = await this.sendRequest("variables", args);
    return response as DebugProtocol.VariablesResponse;
  }
  /* async sendNextRequest(args: DebugProtocol.NextArguments) {
    const response = await this.sendRequest("next", args);
    return response as DebugProtocol.NextResponse;
  } */
  async waitFor(event: string) {
    return new Promise<DebugProtocol.Event>((resolve) => {
      this.once(event, (event) => resolve(event));
    });
  }
  async waitForThread() {
    const event = await this.waitFor("thread");
    return event as DebugProtocol.ThreadEvent;
  }
  handleMessage(msg: DebugProtocol.ProtocolMessage) {
    if (msg.type === "event") {
      const event = msg as DebugProtocol.Event;
      // console.log("EVENT:", event);
      this.emit(event.event, event);
    }
    super.handleMessage(msg);
  }
  async getSource(path: string) {
    if (this._sources.has(path)) {
      return this._sources.get(path) ?? "";
    }
    const source = await readFile(path, { encoding: "utf-8" });
    this._sources.set(path, source);
    return source;
  }
  async getVariables(threadId: number) {
    const {
      body: { stackFrames },
    } = await this.sendStackTraceRequest({ threadId });
    const [stackFrame] = stackFrames;
    if (!stackFrame) {
      return { local: [], state: [] };
    }
    const source = await this.getSource(stackFrame.source?.path ?? "");
    const lines = source.split("\n");
    const line = lines[stackFrame.line - 1] ?? "";
    console.log(`L${stackFrame.line}:`, line.trim());
    console.log(
      "CALL STACK:",
      stackFrames.map(({ name }) => name),
    );
    //console.log("STACK FRAMES:", stackFrames);
    const {
      body: { scopes },
    } = await this.sendScopesRequest({
      frameId: stackFrame.id,
    });
    const localScope = scopes.find(({ name }) => name === "Local Variables");
    const stateScope = scopes.find(({ name }) => name === "State Variables");
    if (!localScope || !stateScope) {
      return { local: [], state: [] };
    }
    const [
      {
        body: { variables: localVariables },
      },
      {
        body: { variables: stateVariables },
      },
    ] = await Promise.all([
      this.sendVariablesRequest({
        variablesReference: localScope.variablesReference,
      }),
      this.sendVariablesRequest({
        variablesReference: stateScope.variablesReference,
      }),
    ]);
    return { local: localVariables, state: stateVariables };
  }
}
