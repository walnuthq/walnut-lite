import { inspect } from "node:util";
import { Hash } from "viem";
import { uniqBy } from "lodash";
import { CliOptions } from "@/lib/types";
import { createTracingClient, flattenTraceCall } from "@/lib/tracing-client";
import { fetchContract, loadArtifacts } from "@/lib/fetch-contract";
import { formatTrace } from "@/lib/format-trace";

const trace = async (hash: Hash, options: CliOptions) => {
  const tracingClient = createTracingClient(options.rpcUrl);
  const [traceTransactionResult, artifacts] = await Promise.all([
    tracingClient.traceTransaction({
      transactionHash: hash,
      tracer: "callTracer",
      tracerConfig: { /*onlyTopCall: true,*/ withLog: true },
    }),
    options.projectPath ? loadArtifacts(options.projectPath) : [],
  ]);
  if (!traceTransactionResult) {
    console.error("ERROR: debug_traceTransaction returned null");
    return;
  }
  // DEBUG
  if (options.verbose) {
    console.log(inspect(traceTransactionResult, { depth: null, colors: true }));
  }
  const flattenedTraceTransactionResult = uniqBy(
    flattenTraceCall(traceTransactionResult),
    "to",
  );
  const contracts = await Promise.all(
    flattenedTraceTransactionResult.map(({ to }) =>
      fetchContract(to, tracingClient, artifacts, options),
    ),
  );
  const formattedTrace = formatTrace(traceTransactionResult, contracts);
  console.log(formattedTrace);
};

export default trace;
