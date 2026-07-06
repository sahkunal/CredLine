export const IX_DISCRIMINATOR = {
  // FlowPay
  createFlowpay: Buffer.from([149, 152, 125, 104, 106, 47, 149, 10]),
  executeFlowpay: Buffer.from([129, 154, 117, 101, 114, 119, 39, 11]),
  reapproveFlowpay: Buffer.from([26, 164, 181, 255, 212, 193, 104, 127]),
  cancelFlowpay: Buffer.from([190, 132, 160, 217, 129, 138, 42, 35]),
 
  // FlowBadge
  mintBadge: Buffer.from([242, 234, 237, 183, 232, 245, 146, 1]),
  updateBadge: Buffer.from([37, 164, 51, 7, 73, 30, 180, 177]),
 
  // FlowLend
  borrow: Buffer.from([228, 253, 131, 202, 207, 116, 89, 18]),
  repay: Buffer.from([234, 103, 67, 82, 208, 234, 219, 166]),
  liquidateDefaultedLoan: Buffer.from([119, 13, 213, 208, 96, 130, 158, 134]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  withdraw: Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]),
} as const;