import { Module } from '@nestjs/common';
import { TenancyModule } from '../../common/tenancy/tenancy.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [TenancyModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
