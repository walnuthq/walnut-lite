import { inspect } from "node:util";
import { Address, encodeFunctionData } from "viem";
import { uniqBy } from "lodash";
import { createTracingClient, flattenTraceCall } from "@/lib/tracing-client";
import { CliOptions } from "@/lib/types";
import { fetchContract, loadArtifacts } from "@/lib/fetch-contract";
import { formatTrace } from "@/lib/format-trace";

const simulate = async (
  to: Address,
  sig: string | undefined,
  args: string[] | undefined,
  options: CliOptions,
) => {
  const tracingClient = createTracingClient(options.rpcUrl);
  const artifacts = options.projectPath
    ? await loadArtifacts(options.projectPath)
    : [];
  const contract = await fetchContract(to, tracingClient, artifacts, options);
  const [functionName] = sig?.split("(") ?? [];
  const data = encodeFunctionData({
    abi: contract.abi,
    functionName,
    args,
  });
  const traceCallResult = await tracingClient.traceCall({
    to,
    data,
    blockNrOrHash: options.block,
    txIndex: options.txIndex ?? 0,
    tracer: "callTracer",
    tracerConfig: { withLog: true },
  });
  if (!traceCallResult) {
    console.error("ERROR: debug_traceCall failed");
    return;
  }
  // DEBUG
  if (options.verbose) {
    console.log(inspect(traceCallResult, { depth: null, colors: true }));
  }
  const flattenedTraceTransactionResult = uniqBy(
    flattenTraceCall(traceCallResult),
    "to",
  );
  const contracts = await Promise.all(
    flattenedTraceTransactionResult.map(({ to }) =>
      fetchContract(to, tracingClient, artifacts, options),
    ),
  );
  const formattedTrace = formatTrace(traceCallResult, contracts);
  console.log(formattedTrace);
};

export default simulate;
