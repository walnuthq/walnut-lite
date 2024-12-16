import { decodeFunctionData, decodeFunctionResult, hexToBytes } from "viem";
import { green, yellow, red } from "picocolors";
import { TraceCall, TraceResult, Contract } from "@/lib/types";
import { traceResultToTraceCall } from "@/lib/tracing-client";

const formatEnterCall = (
  { input, to, type }: TraceCall,
  contract: Contract,
  contracts: Contract[],
) => {
  let result = "";
  if (type === "CREATE") {
    const childContract = contracts.find(({ address }) => address === to);
    if (!childContract) {
      return red(`ERROR: Child contract ${to} not found`);
    }
    result += `${yellow("→ new")} ${childContract.info.name}@${to}`;
  } else {
    const { functionName, args } = decodeFunctionData({
      abi: contract.abi,
      data: input,
    });
    result += `${green(contract.info.name)}::${green(functionName)}(${args?.join(", ")})`;
  }
  if (["STATICCALL", "DELEGATECALL"].includes(type)) {
    result += ` ${yellow(`[${type.toLowerCase()}]`)}`;
  }
  return result;
};

const formatExitCall = (
  { input, output, type }: TraceCall,
  contract: Contract,
) => {
  let result = "";
  if (type === "CREATE" && output) {
    const bytecode = hexToBytes(output);
    result += `${green(" ← [Return]")} ${bytecode.length} bytes of code`;
  } else {
    if (output) {
      const { functionName } = decodeFunctionData({
        abi: contract.abi,
        data: input,
      });
      const value = decodeFunctionResult({
        abi: contract.abi,
        functionName,
        data: output,
      });
      result += `${green(" ← [Return]")} ${value}`;
    } else {
      result += green(" ← [Stop]");
    }
  }
  return result;
};

const formatCall = (
  traceCall: TraceCall,
  contracts: Contract[],
  depth: number,
  index: number,
) => {
  const contract = contracts.find(({ address }) => address === traceCall.to);
  if (!contract) {
    return red(`ERROR: Contract ${traceCall.to} not found`);
  }
  let result = "";
  if (index > 0) {
    result += Array.from({ length: depth }, (_, i) =>
      i === depth - 1 ? " ├─ " : " │  ",
    ).join("");
  }
  result += `[${BigInt(traceCall.gasUsed ?? "0x0")}] `;
  result += formatEnterCall(traceCall, contract, contracts);
  result += "\n";
  result += Array.from({ length: depth }, () => " │  ").join("");
  if (traceCall.calls) {
    result += " ├─ ";
    result += traceCall.calls
      .map((call, i) => formatCall(call, contracts, depth + 1, i))
      .join("\n");
    result += "\n";
    result += Array.from({ length: depth }, () => " │  ").join("");
  }
  result += " └─ ";
  result += formatExitCall(traceCall, contract);
  return result;
};

export const formatTrace = (traceResult: TraceResult, contracts: Contract[]) =>
  formatCall(traceResultToTraceCall(traceResult), contracts, 0, 0);
