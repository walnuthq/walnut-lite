import { Abi, Address, Hex } from "viem";
import { TraceType } from "tevm/actions";
import { SolcBytecodeOutput } from "tevm/bundler/solc";
import { Metadata } from "@ethereum-sourcify/lib-sourcify";
import { whatsabi } from "@shazow/whatsabi";

export type CliOptions = {
  rpcUrl: string;
  chainId: number;
  projectPath: string;
  verbose: boolean;
};

export type Contract = {
  address: Address;
  bytecode: Hex;
  name: string;
  sources: whatsabi.loaders.ContractSources;
  abi: Abi;
};

export type Artifact = {
  abi: Abi;
  bytecode: SolcBytecodeOutput;
  deployedBytecode: SolcBytecodeOutput;
  metadata: Metadata;
};

export type RawTraceLog = {
  address: Address;
  topics: [Hex, ...Hex[]] | [];
  data: Hex;
  position: Hex;
};

export type RawTraceCall = {
  type: TraceType;
  from: Address;
  to: Address;
  value?: Hex;
  gas: Hex;
  gasUsed: Hex;
  input: Hex;
  output?: Hex;
  error?: string;
  logs?: RawTraceLog[];
  calls?: RawTraceCall[];
};

export type TraceLog = Omit<RawTraceLog, "position"> & {
  position: number;
};

export type TraceCall = Omit<
  RawTraceCall,
  "value" | "gas" | "gasUsed" | "logs" | "calls"
> & {
  value?: bigint;
  gas: bigint;
  gasUsed: bigint;
  logs?: TraceLog[];
  calls?: TraceCall[];
};

export const rawTraceLogToTraceLog = (traceLog: RawTraceLog): TraceLog => ({
  ...traceLog,
  position: Number(traceLog.position),
});

export const rawTraceCallToTraceCall = (
  traceCall: RawTraceCall,
): TraceCall => ({
  ...traceCall,
  value: traceCall.value ? BigInt(traceCall.value) : undefined,
  gas: BigInt(traceCall.gas),
  gasUsed: BigInt(traceCall.gasUsed),
  logs: traceCall.logs?.map(rawTraceLogToTraceLog),
  calls: traceCall.calls?.map(rawTraceCallToTraceCall),
});
