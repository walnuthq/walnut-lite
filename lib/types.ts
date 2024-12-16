import { Abi, Address, Hex } from "viem";
import {
  TraceResult as TevmTraceResult,
  TraceCall as TevmTraceCall,
} from "tevm/actions";
import { SolcBytecodeOutput } from "tevm/bundler/solc";
import { Metadata } from "@ethereum-sourcify/lib-sourcify";

export type CliOptions = {
  rpcUrl: string;
  chainId: number;
  projectPath: string;
};

export type ContractInfo = {
  name: string;
  match: "partial" | "perfect" | null;
  evmVersion: string;
  compilerVersion: string;
  optimizer: { enabled: boolean; runs: number };
  license: string;
  language: string;
};

export type ContractSource = { path: string; content: string };

export type ContractSources = ContractSource[];

export type Contract = {
  address: Address;
  info: ContractInfo;
  sources: ContractSources;
  abi: Abi;
};

export type Artifact = {
  abi: Abi;
  deployedBytecode: SolcBytecodeOutput;
  metadata: Metadata;
};

export type TraceResult = Omit<TevmTraceResult, "output"> & { output?: Hex };

export type TraceCall = Omit<TevmTraceCall, "output"> & { output?: Hex };
