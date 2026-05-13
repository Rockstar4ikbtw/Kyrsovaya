using autosalon.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;


namespace autosalon.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {

        }

        public DbSet<User> Users { get; set; }
        public DbSet<Car> Cars { get; set; }
        public DbSet<Sale> Sales { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<RoleEntity> Roles { get; set; }
        public DbSet<StatuseEntity> Statuses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Car>().Property(p => p.price).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Application>()
        .HasOne(a => a.Sale)
        .WithOne(s => s.Application)
        .HasForeignKey<Sale>(s => s.ApplicationId);

            modelBuilder.Entity<Sale>().HasOne(s => s.Manager).WithOne().OnDelete(DeleteBehavior.NoAction);
            modelBuilder.Entity<Sale>().HasOne(s => s.Client).WithOne().OnDelete(DeleteBehavior.NoAction);


            modelBuilder.Entity<RoleEntity>().HasData(
                new RoleEntity { Id = (int)Role.User, Name = "Пользователь" },
                new RoleEntity { Id = (int)Role.Admin, Name = "Админ" },
                new RoleEntity { Id = (int)Role.Manager, Name = "Менеджер" },
                new RoleEntity { Id = (int)Role.Accountant, Name = "Бухгалтер" }
                );

            modelBuilder.Entity<StatuseEntity>().HasData(
                new RoleEntity { Id = (int)Statuse.New, Name = "Новая" },
                new RoleEntity { Id = (int)Statuse.InProgress, Name = "В работе" },
                new RoleEntity { Id = (int)Statuse.Approved, Name = "Одобрена" },
                new RoleEntity { Id = (int)Statuse.Rejected, Name = "Отклонена" }
                );
        }


    }
}
