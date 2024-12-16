import { createPublicClient, http, formatTransactionRequest, Hash } from "viem";
import {
  DebugTraceCallParams,
  DebugTraceTransactionParams,
} from "tevm/actions";
import { TraceResult, TraceCall } from "@/lib/types";

export const createTracingClient = (rpcUrl: string) =>
  createPublicClient({
    transport: http(rpcUrl),
  }).extend((client) => ({
    async traceCall(args: DebugTraceCallParams & { blockHash?: Hash }) {
      return client.request({
        // @ts-ignore
        method: "debug_traceCall",
        params: [
          formatTransactionRequest(args),
          args.blockHash ?? "latest",
          // @ts-ignore
          { tracer: args.tracer },
        ],
      });
    },
    async traceTransaction(
      args: DebugTraceTransactionParams,
    ): Promise<TraceResult> {
      return client.request({
        // @ts-ignore
        method: "debug_traceTransaction",
        params: [
          args.transactionHash,
          // @ts-ignore
          { tracer: args.tracer, tracerConfig: args.tracerConfig },
        ],
      });
    },
  }));

export const traceResultToTraceCall = (
  traceResult: TraceResult,
): TraceCall => ({
  type: traceResult.type,
  from: traceResult.from,
  to: traceResult.to,
  gas: traceResult.gas,
  gasUsed: traceResult.gasUsed,
  input: traceResult.input,
  output: traceResult.output,
  calls: traceResult.calls,
  value: traceResult.value,
});

const flattenTraceCalls = (traceCalls: TraceCall[]) =>
  traceCalls.reduce<TraceCall[]>((accumulator, currentValue) => {
    accumulator.push(currentValue);
    if (currentValue.calls) {
      accumulator.push(...flattenTraceCalls(currentValue.calls));
    }
    return accumulator;
  }, []);

export const flattenTraceResult = (traceResult: TraceResult) => {
  const result = [];
  result.push(traceResultToTraceCall(traceResult));
  if (traceResult.calls) {
    result.push(...flattenTraceCalls(traceResult.calls));
  }
  return result;
};
