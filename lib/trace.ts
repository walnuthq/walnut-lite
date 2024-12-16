import { inspect } from "node:util";
import { Hash } from "viem";
import { uniqBy } from "lodash";
import { CliOptions } from "@/lib/types";
import { createTracingClient, flattenTraceResult } from "@/lib/tracing-client";
import { fetchContract, loadArtifacts } from "@/lib/fetch-contract";
import { formatTrace } from "@/lib/format-trace";

const trace = async (hash: Hash, options: CliOptions) => {
  const tracingClient = createTracingClient(options.rpcUrl);
  const [traceResult, artifacts] = await Promise.all([
    tracingClient.traceTransaction({
      transactionHash: hash,
      tracer: "callTracer",
      // tracerConfig: { onlyTopCall: true },
    }),
    options.projectPath ? loadArtifacts(options.projectPath) : [],
  ]);
  // DEBUG
  console.log(inspect(traceResult, { depth: null, colors: true }));
  const flattenedTraceResult = uniqBy(flattenTraceResult(traceResult), "to");
  const contracts = await Promise.all(
    flattenedTraceResult.map(({ to }) =>
      fetchContract(to, tracingClient, artifacts, options),
    ),
  );
  const formattedTrace = formatTrace(
    traceResult,
    contracts.filter((contract) => contract !== null),
  );
  console.log(formattedTrace);
};

export default trace;
