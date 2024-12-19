import { createPublicClient, http, formatTransactionRequest, Hash } from "viem";
import {
  DebugTraceCallParams,
  DebugTraceTransactionParams,
} from "tevm/actions";
import { RawTraceCall, TraceCall, rawTraceCallToTraceCall } from "@/lib/types";

export const createTracingClient = (rpcUrl: string) =>
  createPublicClient({
    transport: http(rpcUrl),
  }).extend((client) => ({
    async traceCall(
      args: DebugTraceCallParams & { blockHash?: Hash },
    ): Promise<TraceCall | null> {
      const traceCallResult = await client.request({
        // @ts-ignore
        method: "debug_traceCall",
        params: [
          formatTransactionRequest(args),
          args.blockHash ?? "latest",
          // @ts-ignore
          { tracer: args.tracer },
        ],
      });
      if (!traceCallResult) {
        return null;
      }
      return rawTraceCallToTraceCall(
        traceCallResult as unknown as RawTraceCall,
      );
    },
    async traceTransaction(
      args: DebugTraceTransactionParams,
    ): Promise<TraceCall | null> {
      const traceTransactionResult = await client.request({
        // @ts-ignore
        method: "debug_traceTransaction",
        params: [
          args.transactionHash,
          // @ts-ignore
          { tracer: args.tracer, tracerConfig: args.tracerConfig },
        ],
      });
      if (!traceTransactionResult) {
        return null;
      }
      return rawTraceCallToTraceCall(
        traceTransactionResult as unknown as RawTraceCall,
      );
    },
  }));

const flattenTraceCalls = (traceCalls: TraceCall[]) =>
  traceCalls.reduce<TraceCall[]>((accumulator, currentValue) => {
    accumulator.push(currentValue);
    if (currentValue.calls) {
      accumulator.push(...flattenTraceCalls(currentValue.calls));
    }
    return accumulator;
  }, []);

export const flattenTraceCall = (traceCall: TraceCall) => {
  const result = [];
  result.push(traceCall);
  if (traceCall.calls) {
    result.push(...flattenTraceCalls(traceCall.calls));
  }
  return result;
};
