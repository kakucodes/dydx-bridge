import { ExpandMore } from "@mui/icons-material";
import { usePrepareWrappedDydxTokenBridge } from "../generated";
import { is0xAddress, WDYDX_CONTRACT } from "../Form/Form";
import { LoadingButton } from "@mui/lab";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Grid,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  bech32Validity,
  ReceiverAddressInput,
} from "../ReceiverAddressInput/ReceiverAddressInput";
import { useContractWrite, useWaitForTransaction } from "wagmi";
import { toHex } from "viem";
import { dydxToEth } from "../../utils/ethToDydx";
import { isLeft, tryCatch } from "fp-ts/lib/Either";
import { useChain } from "@cosmos-kit/react";

type Props = {
  address: `0x${string}` | undefined;
  onSubmit: (allowanceAmount: bigint) => void;
  onRecipientChange: (recipient: string) => void;
  cosmosAddress: string | undefined;
  allowanceAmount: bigint | undefined;
};

export const BridgeStep = ({
  address: ethAddress,
  // cosmosAddress,
  onSubmit,
  onRecipientChange,
  allowanceAmount,
}: Props) => {
  const {
    isWalletConnected,
    connect,
    isWalletConnecting,
    // address: cosmosAddress,
  } = useChain("dydx");
  const [expanded, setExpanded] = useState(true);
  const [cosmosAddress, setCosmosAddress] = useState<string>("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    !bridgeData.isError && approveWrite && approveWrite();
  };

  const [cosmosEthAddress, verifiedCosmosEthAddress] = useMemo(() => {
    const cosmosEthAddress = cosmosAddress
      ? tryCatch(
          () => dydxToEth(cosmosAddress)?.toLowerCase(),
          () => undefined
          // @ts-ignore
        )?.right
      : undefined;
    const verifiedCosmosEthAddress = is0xAddress(cosmosEthAddress)
      ? cosmosEthAddress
      : undefined;

    return [cosmosEthAddress, verifiedCosmosEthAddress];
  }, [cosmosAddress]);

  // console.log({ cosmosEthAddress });

  const { config: bridgeConfig, ...bridgeData } =
    usePrepareWrappedDydxTokenBridge({
      chainId: 1,
      account: ethAddress,
      args:
        (typeof allowanceAmount !== "undefined" &&
          typeof verifiedCosmosEthAddress !== "undefined" && [
            allowanceAmount,
            verifiedCosmosEthAddress,

            // `0x${"0"}`,
            // 60000000000000000000000n,
            // "0xbe71c95476362c25db4e8d4ff0c65ed18d2f18cc",
            toHex(""),
          ]) ||
        undefined,

      // amount: amountToBridge.toString(),
    });
  const {
    data: approveData,
    write: approveWrite,
    ...writeParams
  } = useContractWrite(bridgeConfig);

  const approvalTx = useWaitForTransaction({ hash: approveData?.hash });

  useEffect(() => {
    allowanceAmount && expanded && setExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowanceAmount]);

  const allowanceAmountStr = allowanceAmount?.toString() || "";

  const formattedAllowance = allowanceAmount
    ? Number(
        allowanceAmount / BigInt(1e18) +
          "." +
          allowanceAmountStr.substring(
            Math.max(0, allowanceAmountStr.length - 18)
          )
      ).toString()
    : 0;

  return (
    <Box
      component="form"
      flexGrow={1}
      noValidate
      onSubmit={handleSubmit}
      sx={{ mt: 3 }}
    >
      <Grid item xs={12}>
        <Accordion style={{ borderRadius: "4px" }} expanded={expanded}>
          <AccordionSummary
            onClick={() => setExpanded(!expanded)}
            expandIcon={<ExpandMore />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Bridge Tokens</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography>{formattedAllowance} DYDX</Typography>

              <ReceiverAddressInput
                value={cosmosAddress || ""}
                onChange={setCosmosAddress}
              />
            </Box>

            <Box>Est Bridging Time: ~32 hours</Box>

            <LoadingButton
              disabled={
                !allowanceAmount ||
                !cosmosAddress ||
                isLeft(bech32Validity(cosmosAddress))
              }
              loading={
                //   approvalData.isLoading ||
                approvalTx.isLoading || writeParams?.isLoading
              }
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Bridge Tokens
            </LoadingButton>
          </AccordionDetails>
        </Accordion>{" "}
        <Box>
          {!!approvalTx.data && (
            <Alert
              severity={
                approvalTx.data.status === "success" ? "success" : "info"
              }
            >
              <Link
                target="_blank"
                referrerPolicy="no-referrer"
                href={`https://etherscan.io/tx/${approvalTx.data.transactionHash}`}
              >
                View Bridge TX on Etherscan
              </Link>
            </Alert>
          )}
        </Box>
      </Grid>
    </Box>
  );
};
