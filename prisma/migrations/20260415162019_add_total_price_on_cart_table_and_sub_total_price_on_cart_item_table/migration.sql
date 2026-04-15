-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "totalPrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "subTotalPrice" INTEGER NOT NULL DEFAULT 0;
