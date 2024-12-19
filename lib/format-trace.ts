import {
  decodeFunctionData,
  DecodeFunctionDataParameters,
  decodeFunctionResult,
  DecodeFunctionResultParameters,
  decodeEventLog,
  decodeErrorResult,
  decodeAbiParameters,
  hexToBytes,
  Abi,
  AbiFunction,
  getAbiItem,
  GetAbiItemParameters,
  AbiParameter,
  AbiEvent,
  Hex,
} from "viem";
import { AbiConstructor, AbiEventParameter } from "abitype";
import { green, yellow, red, cyan, magenta } from "picocolors";
import { TraceCall, TraceLog, Contract } from "@/lib/types";

const decodeFunctionDataSafe = (params: DecodeFunctionDataParameters) => {
  try {
    return decodeFunctionData(params);
  } catch (error) {
    console.error(error);
    return { functionName: params.data.slice(0, 10), args: undefined };
  }
};

const decodeFunctionResultSafe = (params: DecodeFunctionResultParameters) => {
  try {
    return decodeFunctionResult(params);
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

const formatLogArgs = (
  argsRaw: readonly unknown[] | undefined,
  abiEvent?: AbiEvent,
) => {
  if (argsRaw === undefined) {
    return "";
  }
  const args = argsRaw as unknown as Record<string, unknown>;
  if (!abiEvent) {
    return Object.keys(args)
      .map((key) => `${magenta(key)}: ${args[key]}`)
      .join(", ");
  }
  return abiEvent.inputs
    .map((input) => formatAbiEventParameter(args[input.name ?? ""], input))
    .join(", ");
};

const getAbiEvent = (params: GetAbiItemParameters) => {
  const abiEvent = getAbiItem(params);
  return abiEvent ? (abiEvent as AbiEvent) : undefined;
};

const formatLog = ({ data, topics }: TraceLog, abi: Abi) => {
  const { eventName, args } = decodeEventLog({ abi, data, topics });
  const abiEvent = getAbiEvent({ abi, name: eventName ?? "" });
  return ` ├─ emit ${eventName}(${formatLogArgs(args, abiEvent)})`;
};

const formatAbiParameterType = ({ type, internalType }: AbiParameter) => {
  const actualType = internalType ?? type;
  if (actualType.includes("struct")) {
    const [, structName] = actualType.split(" ");
    return structName;
  } else {
    return actualType;
  }
};

const formatAbiParameterName = ({ name }: AbiParameter | AbiEventParameter) =>
  `${name ? ` ${name}` : ""}`;

const formatAbiParameter = (value: unknown, abiParameter: AbiParameter) =>
  `${cyan(formatAbiParameterType(abiParameter))}${magenta(formatAbiParameterName(abiParameter))}: ${formatAbiParameterValue(value, abiParameter)}`;

const formatAbiEventParameter = (
  value: unknown,
  abiEventParameter: AbiEventParameter,
) =>
  `${cyan(`${formatAbiParameterType(abiEventParameter)}${abiEventParameter.indexed ? " indexed" : ""}`)}${magenta(formatAbiParameterName(abiEventParameter))}: ${formatAbiParameterValue(value, abiEventParameter)}`;

const formatAbiParameterValue = (
  value: unknown,
  abiParameter: AbiParameter | AbiEventParameter,
): string => {
  switch (abiParameter.type) {
    case "bool": {
      return `${value}`;
    }
    case "uint8":
    case "uint16":
    case "uint24":
    case "uint32":
    case "uint40":
    case "uint48":
    case "uint56":
    case "uint64":
    case "uint72":
    case "uint80":
    case "uint88":
    case "uint96":
    case "uint104":
    case "uint112":
    case "uint120":
    case "uint128":
    case "uint136":
    case "uint144":
    case "uint152":
    case "uint160":
    case "uint168":
    case "uint176":
    case "uint184":
    case "uint192":
    case "uint200":
    case "uint208":
    case "uint216":
    case "uint224":
    case "uint232":
    case "uint240":
    case "uint248":
    case "uint256": {
      return `${value}`;
    }
    case "int8":
    case "int16":
    case "int24":
    case "int32":
    case "int40":
    case "int48":
    case "int56":
    case "int64":
    case "int72":
    case "int80":
    case "int88":
    case "int96":
    case "int104":
    case "int112":
    case "int120":
    case "int128":
    case "int136":
    case "int144":
    case "int152":
    case "int160":
    case "int168":
    case "int176":
    case "int184":
    case "int192":
    case "int200":
    case "int208":
    case "int216":
    case "int224":
    case "int232":
    case "int240":
    case "int248":
    case "int256": {
      return `${value}`;
    }
    case "bytes":
    case "bytes1":
    case "bytes2":
    case "bytes3":
    case "bytes4":
    case "bytes5":
    case "bytes6":
    case "bytes7":
    case "bytes8":
    case "bytes9":
    case "bytes10":
    case "bytes11":
    case "bytes12":
    case "bytes13":
    case "bytes14":
    case "bytes15":
    case "bytes16":
    case "bytes17":
    case "bytes18":
    case "bytes19":
    case "bytes20":
    case "bytes21":
    case "bytes22":
    case "bytes23":
    case "bytes24":
    case "bytes25":
    case "bytes26":
    case "bytes27":
    case "bytes28":
    case "bytes29":
    case "bytes30":
    case "bytes31":
    case "bytes32": {
      return `${value}`;
    }
    case "address": {
      return `${value}`;
    }
    case "string": {
      return `"${value}"`;
    }
    case "tuple": {
      const tuple = value as Record<string, unknown>;
      const { components } = abiParameter as {
        components: readonly AbiParameter[];
      };
      const [, structName] = abiParameter.internalType
        ? abiParameter.internalType.split(" ")
        : [];
      return `${cyan(structName)}({ ${components
        .map((component) =>
          formatAbiParameter(tuple[component.name ?? ""], component),
        )
        .join(", ")} })`;
    }
    // arrays
    default: {
      const array = value as unknown[];
      const typeMatches = abiParameter.type.match(/(.*)\[(\d*)\]/);
      if (!typeMatches) {
        return `[${array.join(", ")}]`;
      }
      const [, type] = typeMatches;
      if (!type) {
        return `[${array.join(", ")}]`;
      }
      const internalTypeMatches = abiParameter.internalType
        ? abiParameter.internalType.match(/(.*)\[(\d*)\]/)
        : null;
      const [, internalType] = internalTypeMatches ?? [];
      const arrayFormatted = array
        .map((item, index) =>
          formatAbiParameterValue(item, {
            ...abiParameter,
            name: `${abiParameter.name}[${index}]`,
            type,
            internalType,
          }),
        )
        .join(", ");
      return `[${arrayFormatted}]`;
    }
  }
};

const formatCallArgs = (
  args: readonly unknown[] | undefined,
  abiFunction?: AbiFunction | AbiConstructor,
) => {
  if (args === undefined) {
    return "";
  }
  if (!abiFunction) {
    return args.join(", ");
  }
  return abiFunction.inputs
    .map((input, index) => formatAbiParameter(args[index], input))
    .join(", ");
};

const getAbiFunction = (params: GetAbiItemParameters) => {
  const abiFunction = getAbiItem(params);
  return abiFunction ? (abiFunction as AbiFunction) : undefined;
};

const getAbiConstructor = (abi: Abi) => {
  const abiConstructor = abi.find(({ type }) => type === "constructor");
  return abiConstructor ? (abiConstructor as AbiConstructor) : undefined;
};

const getContractMetadata = (bytecode: Hex) => {
  const last2Bytes = bytecode.slice(-4);
  const cborLength = Number(`0x${last2Bytes}`);
  return bytecode.slice(-cborLength * 2 - 4, -4);
};

const decodeDeployData = ({
  abi,
  bytecode,
  data,
}: {
  abi: Abi;
  bytecode: Hex;
  data: Hex;
}) => {
  const metadata = getContractMetadata(bytecode);
  const last2Bytes = bytecode.slice(-4);
  const [, args] = data.split(`${metadata}${last2Bytes}`);
  const abiConstructor = getAbiConstructor(abi);
  if (!args || !abiConstructor) {
    return { args: [], bytecode };
  }
  return {
    args: decodeAbiParameters(abiConstructor.inputs, `0x${args}`),
    bytecode,
  };
};

const formatEnterCall = (
  { input, to, type, error }: TraceCall,
  { name, abi }: Contract,
  contracts: Contract[],
) => {
  let result = "";
  if (type === "CREATE") {
    const childContract = contracts.find(({ address }) => address === to);
    if (!childContract) {
      return red(`Error: Child contract ${to} not found`);
    }
    const { args } = decodeDeployData({
      abi: childContract.abi,
      bytecode: childContract.bytecode,
      data: input,
    });
    const abiConstructor = getAbiConstructor(childContract.abi);
    result += `${yellow("→ new")} ${childContract.name}(${formatCallArgs(args, abiConstructor)})@${to}`;
  } else {
    const { functionName, args } = decodeFunctionDataSafe({ abi, data: input });
    const abiFunction = getAbiFunction({ abi, name: functionName, args });
    const color = error ? red : green;
    result += `${color(name)}::${color(functionName)}(${formatCallArgs(args, abiFunction)})`;
  }
  if (["CALL", "STATICCALL", "DELEGATECALL"].includes(type)) {
    result += ` ${yellow(`[${type.toLowerCase()}]`)}`;
  }
  return result;
};

const formatReturnValue = (value: unknown, abiFunction?: AbiFunction) => {
  if (!abiFunction) {
    return value;
  }
  return abiFunction.outputs
    .map((output, index) => {
      return Array.isArray(value)
        ? formatAbiParameter(value[index], output)
        : formatAbiParameter(value, output);
    })
    .join(", ");
};

const formatExitCall = (
  { input, output, type, error }: TraceCall,
  abi: Abi,
) => {
  if (type === "CREATE" && output) {
    const bytecode = hexToBytes(output);
    return `${green(" ← [Return]")} ${bytecode.length} bytes of code`;
  } else {
    if (output) {
      if (error) {
        const { errorName, args } = decodeErrorResult({ abi, data: output });
        return `${red("← [Revert]")} ${errorName}: ${args}`;
      } else {
        const { functionName, args } = decodeFunctionDataSafe({
          abi,
          data: input,
        });
        const value = decodeFunctionResultSafe({
          abi,
          functionName,
          data: output,
        });
        const abiFunction = getAbiFunction({ abi, name: functionName, args });
        return `${green("← [Return]")} ${formatReturnValue(value, abiFunction)}`;
      }
    } else {
      return green("← [Stop]");
    }
  }
};

const formatDepth = (depth: number) =>
  `\n${Array.from({ length: depth }, () => " │  ").join("")}`;

const formatCall = (
  traceCall: TraceCall,
  contracts: Contract[],
  depth: number,
  index: number,
) => {
  const contract = contracts.find(({ address }) => address === traceCall.to);
  if (!contract) {
    return red(`Error: Contract ${traceCall.to} not found`);
  }
  let result = "";
  if (index > 0) {
    result += Array.from({ length: depth }, (_, i) =>
      i === depth - 1 ? " ├─ " : " │  ",
    ).join("");
  }
  result += `[${traceCall.gasUsed}] `;
  result += formatEnterCall(traceCall, contract, contracts);
  result += formatDepth(depth);
  if (traceCall.calls) {
    result += " ├─ ";
    result += traceCall.calls
      .map((call, i) => formatCall(call, contracts, depth + 1, i))
      .join("\n");
    result += formatDepth(depth);
  }
  if (traceCall.logs) {
    result += traceCall.logs
      .map((log) => formatLog(log, contract.abi))
      .join(formatDepth(depth));
    result += formatDepth(depth);
  }
  result += " └─ ";
  result += formatExitCall(traceCall, contract.abi);
  return result;
};

export const formatTrace = (traceResult: TraceCall, contracts: Contract[]) =>
  formatCall(traceResult, contracts, 0, 0);
