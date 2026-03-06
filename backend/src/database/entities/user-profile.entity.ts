import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gender } from '../../common/enums/gender.enum';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { RegionCode } from '../../common/enums/region-code.enum';
import { User } from './user.entity';

@Entity({ name: 'user_profiles' })
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'int' })
  age!: number;

  @Column({ type: 'enum', enum: Gender, default: Gender.UNSPECIFIED })
  gender!: Gender;

  @Column({ type: 'enum', enum: RegionCode })
  regionCode!: RegionCode;

  @Column({ type: 'enum', enum: InterestCategory, array: true, default: '{}' })
  interests!: InterestCategory[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
